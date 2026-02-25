import Preference from "../models/Preference.js";
import Product from "../models/Product.js";
import { rerankWithGroq } from "./groq.service.js";
import { searchShoppingProducts } from "./serpapi.service.js";

const PROVIDER_TIMEOUT_MS =
  Math.max(4000, Number(process.env.RECOMMENDATION_PROVIDER_TIMEOUT_MS) || 12000);
const DIVERSITY_VARIANT_LIMIT = Math.max(1, Math.min(8, Number(process.env.DIVERSITY_VARIANT_LIMIT) || 5));

const PROMPT_LEAK_PATTERNS = [
  /\bassistant_reply\b/i,
  /\bsearch_query\b/i,
  /\binclude_keywords\b/i,
  /\bexclude_keywords\b/i,
  /\bconfidence\b/i,
  /concise ecommerce phrase/i,
  /return strict json/i,
  /5-12 words/i,
];

const sanitizeIncomingQuery = (value) => {
  const text = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  if (PROMPT_LEAK_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text.replace(/^\.\//, "").slice(0, 160);
};

const withTimeout = async (factory, timeoutMs = PROVIDER_TIMEOUT_MS) => {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(factory),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
const calculateAIScore = (product, pref) => {

  let score = 50;

  if (!product) return score;

  score += Number(product.rating || 0) * 10;

  score += Math.min(Number(product.reviews || 0) / 10, 20);

  return Math.max(0, Math.min(100, score));

};

const applyExternalScores = (products, query, pref) => {

  return products
    .map(product => ({
      ...product,
      aiScore: calculateAIScore(product, pref)
    }))
    .sort((a, b) => b.aiScore - a.aiScore);

};
export const recommendProducts = async ({ userId, query, topK = 30, serpApiKey = "" }) => {

  const safeQuery = sanitizeIncomingQuery(query);
  if (!safeQuery) return [];

  const pref = await Preference.findOne({ userId });

  let filter = {};

  if (pref) {
    filter = {
      category: pref.category,
      price: { $lte: pref.maxPrice },
      rating: { $gte: pref.minRating },
    };
  }

  filter.title = { $regex: safeQuery, $options: "i" };

  const dbProducts = await Product.find(filter);

  if (dbProducts.length > 0) {
    return dbProducts
      .map(p => ({
        ...p._doc,
        aiScore: calculateAIScore(p, pref),
      }))
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, topK);
  }

  let serpapiProducts = [];
  try {
    serpapiProducts = await withTimeout(() =>
      searchShoppingProducts(safeQuery, { apiKey: serpApiKey })
    );
  } catch (error) {
    console.log("SerpAPI skipped:", error?.message || error);
    serpapiProducts = [];
  }

  const amazonProducts = [];
  const flipkartProducts = [];
  const myntraProducts = [];

  if (Array.isArray(serpapiProducts)) {

    for (const product of serpapiProducts) {

      const source = (product.source || "").toLowerCase();

      if (source.includes("amazon"))
        amazonProducts.push(product);

      else if (source.includes("flipkart"))
        flipkartProducts.push(product);

      else if (source.includes("myntra"))
        myntraProducts.push(product);

      else
        amazonProducts.push(product);

    }

  }

  const parsePrice = (raw) => {
    if (raw == null) return 0;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const numeric = raw.replace(/[^0-9.]/g, "");
      return numeric ? Number(numeric) : 0;
    }
    return 0;
  };

  // ✅ CORRECT normalizeProduct function
  const normalizeProduct = (p, index, platform) => {

    const price = parsePrice(p.extracted_price ?? p.price);
    const parsedMrp = parsePrice(
      p.extracted_old_price ??
      p.extracted_oldprice ??
      p.old_price ??
      p.original_price ??
      p.originalPrice
    );
    const originalPrice = parsedMrp > price && price > 0 ? parsedMrp : 0;

    return {
      _id: p.product_id || index,
      title: p.title || "Product",
      price,
      originalPrice,
      currency: "INR",
      currencySymbol: "₹",
      image: p.thumbnail || null,
      rating: Number(p.rating || 4),
      reviews: Number(p.reviews || 100),
      ratingForScore: Number(p.rating || 4),
      reviewsForScore: Number(p.reviews || 100),
      platform,
      url: p.link || null,
      aiScore: 0,
      aiReason: `Popular product on ${platform} matching your search`,
      features: [
        "High customer rating",
        "Good value for money"
      ],
    };

  };

  // ✅ Correct mapping (OUTSIDE normalizeProduct)
  const amazonMapped = amazonProducts.map((p, index) =>
    normalizeProduct(p, index, "Amazon")
  );

  const flipkartMapped = flipkartProducts.map((p, index) =>
    normalizeProduct(p, index, "Flipkart")
  );

  const myntraMapped = myntraProducts.map((p, index) =>
    normalizeProduct(p, index, "Myntra")
  );

  const externalProducts = [
    ...flipkartMapped,
    ...amazonMapped,
    ...myntraMapped
  ];

  if (externalProducts.length === 0) {

    return [{
      _id: "fallback",
      title: safeQuery,
      price: 0,
      image: null,
      rating: 4,
      platform: "SmartPick",
      url: `https://www.flipkart.com/search?q=${encodeURIComponent(safeQuery)}`,
      aiScore: 50,
      aiReason: "Fallback result",
    }];

  }

  const withScores = applyExternalScores(externalProducts, safeQuery, pref);

  let reranked = null;

  try {

    reranked = await Promise.race([
      rerankWithGroq({
        query: safeQuery,
        products: withScores
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("groq_timeout")), 3000)
      ),
    ]);

  } catch (e) {

    console.log("Groq skipped:", e.message);
    reranked = null;

  }

  return Array.isArray(reranked)
    ? reranked.slice(0, topK)
    : withScores.slice(0, topK);

};

export const recommendProductsDiverse = async ({
  userId,
  query,
  topK = 30,
  minTarget = 8,
  serpApiKey = "",
}) => {

  const safeQuery = sanitizeIncomingQuery(query);
  if (!safeQuery) return [];

  const baseResults = await recommendProducts({
    userId,
    query: safeQuery,
    topK,
    serpApiKey,
  });

  if (!Array.isArray(baseResults)) return [];

  if (baseResults.length >= minTarget) {
    return baseResults.slice(0, topK);
  }

  if (baseResults.length > 0) {
    return baseResults.slice(0, topK);
  }

  const variants = [safeQuery];

  const settled = await Promise.allSettled(
    variants.map((variant) =>
      recommendProducts({
        userId,
        query: variant,
        topK,
        serpApiKey,
      })
    )
  );

  const merged = [];

  for (const entry of settled) {

    if (entry.status === "fulfilled" && Array.isArray(entry.value)) {
      merged.push(...entry.value);
    }

  }

  const unique = new Map();

  for (const product of merged) {

    const key =
      product._id ||
      product.url ||
      product.title;

    if (!unique.has(key)) {
      unique.set(key, product);
    }

  }

  return [...unique.values()].slice(0, topK);

};

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { recommendProductsDiverse } from "./recommendation.service.js";
import { Buffer } from "buffer";
import { detectFashionPipeline } from "./vision.pipeline.service.js";

const HF_API_KEY = process.env.HF_API_KEY;

if (!HF_API_KEY) {
  console.error("HF_API_KEY missing in .env");
}

const HF_API_URL =
`https://api-inference.huggingface.co/models/${process.env.HF_MODEL || "Salesforce/blip2-flan-t5-xl"}`;

const VISION_MATCH_TIMEOUT_MS = Math.max(3500, Number(process.env.VISION_MATCH_TIMEOUT_MS) || 9000);
const VISION_QUERY_CANDIDATES_LIMIT = Math.max(1, Math.min(5, Number(process.env.VISION_QUERY_CANDIDATES_LIMIT) || 3));
const VISION_STRICT_CATEGORY_DEFAULT = String(process.env.VISION_STRICT_CATEGORY || "true").toLowerCase() !== "false";

const TYPE_MAP = {
  product: { category: "general", subtype: "product" },
  item: { category: "general", subtype: "product" },
  fashion: { category: "apparel", subtype: "top" },
  clothing: { category: "apparel", subtype: "top" },
  apparel: { category: "apparel", subtype: "top" },
  top: { category: "apparel", subtype: "top" },
  shirt: { category: "apparel", subtype: "top" },
  blouse: { category: "apparel", subtype: "top" },
  tshirt: { category: "apparel", subtype: "top" },
  tee: { category: "apparel", subtype: "top" },
  tshirts: { category: "apparel", subtype: "top" },
  hoodie: { category: "apparel", subtype: "top" },
  jacket: { category: "apparel", subtype: "top" },
  dress: { category: "apparel", subtype: "dress" },
  kurti: { category: "apparel", subtype: "dress" },
  gown: { category: "apparel", subtype: "dress" },
  frock: { category: "apparel", subtype: "dress" },
  bag: { category: "bags", subtype: "bag" },
  handbag: { category: "bags", subtype: "bag" },
  tote: { category: "bags", subtype: "bag" },
  purse: { category: "bags", subtype: "bag" },
  backpack: { category: "bags", subtype: "bag" },
  wallet: { category: "bags", subtype: "bag" },
  shoe: { category: "footwear", subtype: "shoes" },
  shoes: { category: "footwear", subtype: "shoes" },
  sneaker: { category: "footwear", subtype: "shoes" },
  sneakers: { category: "footwear", subtype: "shoes" },
  boot: { category: "footwear", subtype: "shoes" },
  sandal: { category: "footwear", subtype: "shoes" },
  watch: { category: "accessories", subtype: "watch" },
  sunglasses: { category: "accessories", subtype: "accessory" },
  belt: { category: "accessories", subtype: "accessory" },
  jewelry: { category: "accessories", subtype: "accessory" },
  jewellery: { category: "accessories", subtype: "accessory" },
  phone: { category: "gadgets", subtype: "phone" },
  smartphone: { category: "gadgets", subtype: "phone" },
  earbuds: { category: "gadgets", subtype: "earbuds" },
  earbud: { category: "gadgets", subtype: "earbuds" },
  headphone: { category: "gadgets", subtype: "headphones" },
  headphones: { category: "gadgets", subtype: "headphones" },
  audio: { category: "gadgets", subtype: "headphones" },
  laptop: { category: "gadgets", subtype: "laptop" },
  tablet: { category: "gadgets", subtype: "tablet" },
  camera: { category: "gadgets", subtype: "camera" },
  gadget: { category: "gadgets", subtype: "gadget" },
};

const SUBTYPE_TERMS = {
  top: ["top", "blouse", "shirt", "t-shirt", "tshirt", "tee", "tunic", "kurti", "crop"],
  dress: ["dress", "gown", "frock", "maxi", "midi", "kurti"],
  bag: ["bag", "handbag", "purse", "tote", "sling", "clutch", "satchel", "backpack", "wallet"],
  shoes: ["shoes", "shoe", "sneaker", "sneakers", "footwear", "heels", "sandals", "boots"],
  watch: ["watch", "smartwatch"],
  phone: ["phone", "mobile", "smartphone", "iphone", "android"],
  earbuds: ["earbuds", "earbud", "tws", "buds"],
  headphones: ["headphone", "headphones", "headset", "earbud", "earbuds", "airpods"],
  laptop: ["laptop", "notebook", "macbook"],
  tablet: ["tablet", "ipad"],
  camera: ["camera", "dslr", "mirrorless"],
  accessory: ["accessory", "accessories", "sunglasses", "belt", "jewellery", "jewelry", "ring", "necklace", "bracelet"],
  gadget: ["gadget", "electronics", "device"],
};

const CATEGORY_TERMS = {
  apparel: ["top", "shirt", "blouse", "t-shirt", "tshirt", "tee", "dress", "kurti", "jeans", "pants", "skirt"],
  bags: ["bag", "handbag", "purse", "tote", "sling", "clutch", "wallet", "backpack"],
  footwear: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "heels", "sandals", "boots"],
  accessories: ["watch", "belt", "jewellery", "jewelry", "bracelet", "ring", "necklace", "sunglasses"],
  gadgets: ["phone", "mobile", "smartphone", "earbud", "earbuds", "headphone", "headphones", "watch", "laptop", "tablet", "ipad", "camera", "keyboard", "mouse"],
};

const COLOR_WORDS = [
  "black", "white", "red", "blue", "green", "yellow", "pink", "purple", "orange",
  "brown", "beige", "cream", "grey", "gray", "navy", "maroon", "olive", "teal",
];

const FASHION_STYLE_TERMS = [
  "floral", "printed", "solid", "plain", "oversized", "crop", "ruched", "casual", "formal",
];

const GENERIC_QUERY_TERMS = new Set([
  "a", "an", "the", "product", "item", "object", "image", "photo", "picture", "background",
]);

const GENERIC_HINT_TERMS = new Set([
  "a", "an", "the", "product", "item", "object", "image", "photo", "picture",
]);

const extractJsonObject = (text) => {
  const value = String(text || "").trim();
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
};

const extractBase64FromDataUrl = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^data:.+;base64,(.+)$/);
  return match?.[1] || text;
};

const normalizeDetectedItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const category = String(item?.category || "").trim().toLowerCase();
      const subtype = String(item?.subtype || "").trim().toLowerCase();
      const attributes = item?.attributes && typeof item.attributes === "object" ? item.attributes : {};
      if (!category && !subtype) return null;
      return { category, subtype, attributes, matches: [] };
    })
    .filter(Boolean)
    .slice(0, 4);
};
const extractAttributes = (text) => ({
  color: COLOR_WORDS.find((c) => text.includes(c)) || "",
  gender: /\bwomen|womens|ladies|girls\b/.test(text)
    ? "women"
    : /\bmen|mens|boys\b/.test(text)
      ? "men"
      : "",
  style: FASHION_STYLE_TERMS.find((s) => text.includes(s)) || "",
});

const extractAdvancedFashionAttributes = (text) => {

  text = text.toLowerCase();

  return {

    color:
      text.match(/\b(black|white|red|blue|green|pink|yellow|purple|orange|brown|beige|cream|grey|navy|maroon|olive|teal)\b/)?.[0] || "",

    gender:
      /\bwomen|female|ladies\b/.test(text)
        ? "women"
        : /\bmen|male\b/.test(text)
        ? "men"
        : "unisex",

    sleeve:
      text.match(/\b(long sleeve|short sleeve|sleeveless|full sleeve|half sleeve|bell sleeve)\b/)?.[0] || "",

    neckline:
      text.match(/\b(v-neck|v neck|round neck|square neck|crew neck|collared)\b/)?.[0] || "",

    pattern:
      text.match(/\b(floral|printed|solid|plain|striped|checked|graphic)\b/)?.[0] || "",

    fit:
      text.match(/\b(slim fit|regular fit|loose fit|oversized|crop)\b/)?.[0] || "",

    material:
      text.match(/\b(cotton|denim|silk|linen|polyester|wool|leather)\b/)?.[0] || "",

  };

};

const parseTextHintToItem = (textHint) => {

  const text = String(textHint || "").toLowerCase().trim();

  if (!text) return null;

  // ENHANCED ATTRIBUTE EXTRACTION
  const attributes = {

    color:
      text.match(/\b(black|white|red|blue|green|yellow|pink|purple|orange|brown|beige|cream|grey|gray|navy|maroon|olive|teal)\b/)?.[0] || "",

    gender:
      /\bwomen|womens|ladies|girls|female\b/.test(text)
        ? "women"
        : /\bmen|mens|boys|male\b/.test(text)
        ? "men"
        : "unisex",

    sleeve:
      text.match(/\b(long sleeve|short sleeve|sleeveless|full sleeve|half sleeve)\b/)?.[0] || "",

    neckline:
      text.match(/\b(v neck|v-neck|round neck|crew neck|square neck|collar|deep neck)\b/)?.[0] || "",

    pattern:
      text.match(/\b(floral|printed|solid|plain|striped|checked|graphic)\b/)?.[0] || "",

    style:
      text.match(/\b(crop|oversized|slim fit|regular fit|tie front|wrap|casual|formal)\b/)?.[0] || "",

    material:
      text.match(/\b(cotton|denim|silk|linen|polyester|wool|leather)\b/)?.[0] || "",
  };


  // TOP detection
  if (
    /\bblouse\b/.test(text) ||
    /\btop\b/.test(text) ||
    /\bshirt\b/.test(text) ||
    /\bt-?shirt\b/.test(text) ||
    /\btee\b/.test(text) ||
    /\bcrop\b/.test(text) ||
    /\bkurti\b/.test(text)
  ) {
    return {
      category: "apparel",
      subtype: "top",
      attributes,
      matches: [],
    };
  }


  // DRESS detection
  if (
    /\bdress\b/.test(text) ||
    /\bgown\b/.test(text) ||
    /\bfrock\b/.test(text)
  ) {
    return {
      category: "apparel",
      subtype: "dress",
      attributes,
      matches: [],
    };
  }


  // SHOES detection
  if (
    /\bshoe\b/.test(text) ||
    /\bshoes\b/.test(text) ||
    /\bsneaker\b/.test(text) ||
    /\bsneakers\b/.test(text)
  ) {
    return {
      category: "footwear",
      subtype: "shoes",
      attributes,
      matches: [],
    };
  }


  // HEADPHONE detection
  if (
    /\bheadphone\b|\bheadphones\b|\bheadset\b|\bearbud\b|\bearbuds\b|\bairpods\b/.test(text)
  ) {
    return {
      category: "gadgets",
      subtype: "headphones",
      attributes,
      matches: [],
    };
  }


  // BAG detection
  if (
    /\bbag\b/.test(text) ||
    /\bhandbag\b/.test(text) ||
    /\bpurse\b/.test(text) ||
    /\btote\b/.test(text)
  ) {
    return {
      category: "bags",
      subtype: "bag",
      attributes,
      matches: [],
    };
  }


  // WATCH detection
  if (/\bwatch\b/.test(text)) {
    return {
      category: "accessories",
      subtype: "watch",
      attributes,
      matches: [],
    };
  }


  // PHONE detection
  if (
    /\bphone\b/.test(text) ||
    /\bmobile\b/.test(text) ||
    /\bsmartphone\b/.test(text)
  ) {
    return {
      category: "gadgets",
      subtype: "phone",
      attributes,
      matches: [],
    };
  }

  // LAPTOP detection
  if (
    /\blaptop\b/.test(text) ||
    /\bnotebook\b/.test(text) ||
    /\bmacbook\b/.test(text)
  ) {
    return {
      category: "gadgets",
      subtype: "laptop",
      attributes,
      matches: [],
    };
  }

  // TABLET detection
  if (
    /\btablet\b/.test(text) ||
    /\bipad\b/.test(text)
  ) {
    return {
      category: "gadgets",
      subtype: "tablet",
      attributes,
      matches: [],
    };
  }

  // CAMERA detection
  if (/\bcamera\b/.test(text)) {
    return {
      category: "gadgets",
      subtype: "camera",
      attributes,
      matches: [],
    };
  }


  // FINAL fallback
  return {
    category: "general",
    subtype: "product",
    attributes,
    matches: [],
  };

};


const detectColorFromImage = (imageDataUrl) => {
  // Byte sampling on compressed image data is not reliable for color detection.
  // Keep fallback color empty to avoid wrong labels like "green product".
  return "";
};


const fallbackDetectedItems = (textHint, imageDataUrl) => {

  const hint = String(textHint || "").toLowerCase();

  const color = detectColorFromImage(imageDataUrl);

  const detectSubtype = () => {

    // priority 1 — text hint
    if (/\btop\b|\bshirt\b|\bblouse\b|\bt-?shirt\b|\btee\b|\bkurti\b/.test(hint))
      return { category: "apparel", subtype: "top" };

    if (/\bdress\b|\bgown\b|\bfrock\b/.test(hint))
      return { category: "apparel", subtype: "dress" };

    if (/\bshoe\b|\bsneaker\b/.test(hint))
      return { category: "footwear", subtype: "shoes" };

    if (/\bbag\b|\bhandbag\b|\bpurse\b/.test(hint))
      return { category: "bags", subtype: "bag" };

    if (/\bwatch\b/.test(hint))
      return { category: "accessories", subtype: "watch" };

    if (/\bphone\b|\bmobile\b/.test(hint))
      return { category: "gadgets", subtype: "phone" };

    if (/\bheadphone\b|\bheadphones\b|\bheadset\b|\bearbud\b|\bearbuds\b|\bairpods\b/.test(hint))
      return { category: "gadgets", subtype: "headphones" };

    if (/\blaptop\b|\bnotebook\b|\bmacbook\b/.test(hint))
      return { category: "gadgets", subtype: "laptop" };

    if (/\btablet\b|\bipad\b/.test(hint))
      return { category: "gadgets", subtype: "tablet" };

    if (/\bcamera\b/.test(hint))
      return { category: "gadgets", subtype: "camera" };


    // priority 2 — image color heuristic
    if (["pink","blue","white","black","grey","red","green"].includes(color))
      return { category: "general", subtype: "product" };

    // priority 3 — default generic product
    return { category: "general", subtype: "product" };
  };

  const detected = detectSubtype();

  return [
    {
      category: detected.category,
      subtype: detected.subtype,
      attributes: {
        color,
        gender: "",
        style: "",
      },
      matches: [],
    },
  ];
};


const withTimeout = async (factory, timeoutMs = VISION_MATCH_TIMEOUT_MS) => {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(factory),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("vision_match_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const detectItemsWithVision = async ({ imageDataUrl, textHint }) => {

  try {

    const base64 = extractBase64FromDataUrl(imageDataUrl);

    const imageBuffer = Buffer.from(base64, "base64");

    const response = await axios.post(
      HF_API_URL,
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        params: {
          wait_for_model: true,
        },
        timeout: 30000,
      }
    );

    const caption =
      (Array.isArray(response?.data)
        ? response?.data?.[0]?.generated_text
        : response?.data?.generated_text) || "";

    console.log("VISION CAPTION:", caption);

    const parsedItem = parseTextHintToItem(
      `${caption} ${textHint}`
    );

    return parsedItem ? [parsedItem] : [];

  }
  catch (err) {

    console.log("VISION ERROR:", err.message);

    return [];

  }

};



const buildQueryFromItem = (item, textHint) => {

  const attributes = item?.attributes || {};

  const caption =
    String(attributes.caption || "").toLowerCase().trim();

  const color =
    String(attributes.color || "").toLowerCase().trim();

  const subtype =
    String(item?.subtype || "").toLowerCase().trim();

  const pattern =
    String(attributes.pattern || "").toLowerCase().trim();

  const material =
    String(attributes.material || "").toLowerCase().trim();

  const hint =
    String(textHint || "").toLowerCase().trim();

  // ✅ PRIORITY 1: HuggingFace caption
  if (caption.length > 5 && !caption.includes("image")) {

    console.log("USING HF CAPTION AS QUERY:", caption);

    return caption;
  }

  // ✅ PRIORITY 2: structured attributes
  const tokens = [];

  if (color) tokens.push(color);
  if (pattern) tokens.push(pattern);
  if (material) tokens.push(material);
  if (subtype) tokens.push(subtype);
  if (hint) tokens.push(hint);

  const finalQuery =
    tokens.join(" ").trim();

  console.log("USING ATTRIBUTE QUERY:", finalQuery);

  return finalQuery || hint || "clothing";

};

const isUsefulCaptionText = (value) => {
  const text = String(value || "").toLowerCase().trim();
  if (!text || text.length < 3) return false;
  const tokens = text.split(/\s+/).filter(Boolean);
  const informative = tokens.filter((token) => !GENERIC_QUERY_TERMS.has(token));
  return informative.length >= 2;
};

const isUsefulHintText = (value) => {
  const text = String(value || "").toLowerCase().trim();
  if (!text || text.length < 2) return false;
  const tokens = text.split(/\s+/).filter(Boolean);
  const informative = tokens.filter((token) => !GENERIC_HINT_TERMS.has(token));
  return informative.length >= 1;
};

const buildQueryCandidatesFromItem = (item, textHint) => {

  const caption =
    String(item?.attributes?.caption || "")
      .toLowerCase()
      .trim();

  const color =
    String(item?.attributes?.color || "")
      .toLowerCase()
      .trim();

  const subtype =
    String(item?.subtype || "")
      .toLowerCase()
      .trim();

  const pattern =
    String(item?.attributes?.pattern || "")
      .toLowerCase()
      .trim();

  const material =
    String(item?.attributes?.material || "")
      .toLowerCase()
      .trim();

  const gender =
    String(item?.attributes?.gender || "")
      .toLowerCase()
      .trim();

  const queries = [];

  const push = (q) => {
    if (!q) return;
    if (!queries.includes(q)) queries.push(q);
  };

  // ✅ PRIORITY 1: FULL CAPTION (MOST IMPORTANT FIX)
  if (isUsefulCaptionText(caption)) {
    push(caption);
  }

  // ✅ PRIORITY 2: structured attributes
  push([gender, color, pattern, material, subtype].filter(Boolean).join(" "));

  push([color, pattern, subtype].filter(Boolean).join(" "));

  push([gender, color, subtype].filter(Boolean).join(" "));

  push([color, subtype].filter(Boolean).join(" "));

  // ✅ FINAL fallback
  if (isUsefulHintText(textHint)) push(textHint);
  if (subtype && subtype !== "product") {
    push([color, subtype].filter(Boolean).join(" "));
    push(subtype);
  } else if (isUsefulCaptionText(caption)) {
    push(caption);
  } else if (isUsefulHintText(textHint)) {
    push(textHint);
  }

  console.log("VISION QUERY CANDIDATES:", queries);

  return queries.slice(0, VISION_QUERY_CANDIDATES_LIMIT);
};
const dedupeProducts = (products, topK) => {
  const seen = new Set();
  const output = [];
  for (const product of products || []) {
    const key = String(
      product?._id ||
      product?.id ||
      `${product?.title || ""}|${product?.platform || ""}|${product?.url || ""}`
    ).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(product);
    if (output.length >= topK) break;
  }
  return output;
};

const normalizeGender = (value) => {
  const token = String(value || "").toLowerCase();
  if (["women", "womens", "woman", "ladies", "girls"].includes(token)) return "women";
  if (["men", "mens", "man", "boys"].includes(token)) return "men";
  return "";
};

const productSearchHay = (product) =>
  String([
    product?.title || "",
    product?.category || "",
    product?.aiReason || "",
    ...(Array.isArray(product?.features) ? product.features : []),
  ].join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ");

const productMatchesDetectedItem = (product, item, strictCategory) => {
  const hay = productSearchHay(product);
  const subtype = String(item?.subtype || "").toLowerCase().trim();
  const category = String(item?.category || "").toLowerCase().trim();
  const gender = normalizeGender(item?.attributes?.gender);
  const color = String(item?.attributes?.color || "").toLowerCase().trim();

  if (gender) {
    const hasWomen = /\bwomen\b|\bwomens\b|\bwoman\b|\bladies\b|\bgirls\b/.test(hay);
    const hasMen = /\bmen\b|\bmens\b|\bman\b|\bboys\b/.test(hay);
    if (gender === "women" && hasMen && !hasWomen) return false;
    if (gender === "men" && hasWomen && !hasMen) return false;
  }

  // Keep subtype guard even when strict mode is off, so shoes don't return dresses.
  if (subtype && subtype !== "product" && SUBTYPE_TERMS[subtype]) {
    const subtypeMatched = SUBTYPE_TERMS[subtype].some((term) => hay.includes(term));
    if (!subtypeMatched) return false;
    if (!strictCategory) return true;
  }
  if (!strictCategory) return true;

  if (color) {
    const normalizedColor = color === "grey" ? "gray" : color;
    if (!hay.includes(color) && !hay.includes(normalizedColor)) {
      return false;
    }
  }

  if (category && CATEGORY_TERMS[category]) {
    return CATEGORY_TERMS[category].some((term) => hay.includes(term));
  }

  return true;
};

const choosePreferredDetectedItem = ({ pipelineItem, hfItem, captionItem, textHint }) => {
  const hintItem = parseTextHintToItem(textHint);
  if (hintItem?.subtype && hintItem.subtype !== "product") return hintItem;

  const pipelineSubtype = String(pipelineItem?.subtype || "").toLowerCase();
  const hfSubtype = String(hfItem?.subtype || "").toLowerCase();
  const captionSubtype = String(captionItem?.subtype || "").toLowerCase();

  if (captionSubtype && captionSubtype !== "product") return captionItem;
  if (hfSubtype && hfSubtype !== "product" && pipelineSubtype === "product") return hfItem;
  if (pipelineSubtype && pipelineSubtype !== "product") return pipelineItem;
  if (hfSubtype && hfSubtype !== "product") return hfItem;

  return captionItem || pipelineItem || hfItem || hintItem || null;
};

const fetchMatchesForItem = async ({ item, textHint, perItemLimit, strictCategory }) => {
  const candidates = buildQueryCandidatesFromItem(item, textHint);
  if (
    String(item?.subtype || "").toLowerCase().trim() === "product" &&
    candidates.length === 0
  ) {
    return [];
  }
  const settled = await Promise.allSettled(
    candidates.map((query) =>
      withTimeout(() => recommendProductsDiverse({ query, topK: perItemLimit * 2, minTarget: 4 }))
    )
  );

  const merged = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    if (Array.isArray(result.value) && result.value.length > 0) {
      merged.push(...result.value);
    }
  }

  const deduped = dedupeProducts(merged, perItemLimit * 2);
  const filtered = deduped.filter((product) => productMatchesDetectedItem(product, item, strictCategory));
  return dedupeProducts(filtered, perItemLimit);
};

// ADD THIS FUNCTION ABOVE searchByImageVision

const mapFashionType = (type) => {

  const raw = String(type || "").toLowerCase().trim();
  if (!raw) return "product";

  for (const [keyword, value] of Object.entries(TYPE_MAP)) {
    if (raw === keyword || raw.includes(keyword)) {
      return value.subtype;
    }
  }

  return "product";
};



export const searchByImageVision = async ({
  imageDataUrl,
  textHint = "",
  topK = 24,
  strictCategory = VISION_STRICT_CATEGORY_DEFAULT,
}) => {

  const safeTopK = Math.max(6, Math.min(Number(topK) || 24, 60));

  let detectedItems = [];
  let provider = "heuristic_fallback";

  try {

  const pipeline = await detectFashionPipeline(imageDataUrl);
  const hfDetected = await detectItemsWithVision({ imageDataUrl, textHint });
  const hfItem = Array.isArray(hfDetected) && hfDetected.length > 0 ? hfDetected[0] : null;

  console.log("PIPELINE RAW:", pipeline);

  const fashion = pipeline?.fashion || {};
  const caption = pipeline?.caption || fashion?.raw_caption || "";

  console.log("PIPELINE RAW OUTPUT:", JSON.stringify(pipeline, null, 2));
  console.log("PIPELINE FASHION:", JSON.stringify(fashion, null, 2));
  console.log("PIPELINE TYPE:", fashion.type);
  const captionItem = parseTextHintToItem(caption);

  const rawType = String(
    fashion.type ||
    fashion.subtype ||
    fashion.category ||
    fashion.item ||
    fashion.label ||
    ""
  )
    .toLowerCase()
    .trim();

  const subtypeSource =
    rawType && rawType !== "product"
      ? rawType
      : `${caption} ${textHint}`.trim();

  const subtype = mapFashionType(subtypeSource);
  const category = TYPE_MAP[subtype]?.category || "general";

const pipelineItem = {
  category,
  subtype,
  attributes: {
    color: hfItem?.attributes?.color || fashion.color || "",
    material: fashion.material || "",
    pattern: fashion.pattern || "",
    sleeve: fashion.sleeve || "",
    neckline: fashion.neckline || "",
    fit: fashion.fit || "",
    gender: fashion.gender || "",
    occasion: fashion.occasion || "",
    caption
  },
  matches: []
};

const preferredItem = choosePreferredDetectedItem({
  pipelineItem,
  hfItem,
  captionItem,
  textHint,
});

if (preferredItem?.subtype === "product") {
  preferredItem.attributes = {
    ...preferredItem.attributes,
    color: "",
    pattern: "",
    material: "",
  };
} else {
  preferredItem.attributes = {
    ...(pipelineItem?.attributes || {}),
    ...(hfItem?.attributes || {}),
    ...(captionItem?.attributes || {}),
    ...(preferredItem?.attributes || {}),
  };
}

const visionItems = preferredItem ? [preferredItem] : [];

  console.log("FINAL DETECTED:", visionItems);

  if (visionItems.length > 0) {

    detectedItems = visionItems;
    provider = "groq-fashion-pipeline";

  } else {

    detectedItems =
      Array.isArray(hfDetected) && hfDetected.length > 0
        ? hfDetected
        : fallbackDetectedItems(textHint, imageDataUrl);

    console.log("USING FALLBACK:", detectedItems);

  }

}
catch (error) {

  console.log("VISION FAILED:", error.message);

  const hfDetected = await detectItemsWithVision({ imageDataUrl, textHint });
  detectedItems =
    Array.isArray(hfDetected) && hfDetected.length > 0
      ? hfDetected
      : fallbackDetectedItems(textHint, imageDataUrl);

}



const perItemLimit = Math.max(
  4,
  Math.floor(safeTopK / Math.max(1, detectedItems.length))
);

const allResults = [];

const perItemMatches = await Promise.all(
  detectedItems.map(async (item) => {
    const matches = await fetchMatchesForItem({
      item,
      textHint,
      perItemLimit,
      strictCategory
    });

    return matches;
  })
);

detectedItems.forEach((item, index) => {

  const matches = perItemMatches[index] || [];

  item.matches = matches.map(product => ({ product }));

  allResults.push(...matches);

});

return {

  provider,

  detected_items: detectedItems,

  results: dedupeProducts(allResults, safeTopK),

};

};

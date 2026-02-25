import axios from "axios";

const resolveSerpApiKey = (overrideKey = "") =>
  String(
    overrideKey ||
      process.env.SERPAPI_KEY ||
      process.env.SERPAPI_API_KEY ||
      ""
  ).trim();

const SERPAPI_VARIANT_LIMIT =
  Math.max(1, Math.min(3, Number(process.env.SERPAPI_VARIANT_LIMIT) || 1));

// ✅ Improved query expansion with category awareness
const expandQuery = (query) => {

  const base = String(query || "").trim().toLowerCase();

  if (!base) return [];

  // detect electronics
  const isElectronics =
    /\b(phone|mobile|iphone|android|laptop|macbook|tablet|ipad|camera|headphone|earbud|watch|smartwatch)\b/.test(base);

  // detect fashion
  const isFashion =
    /\b(top|shirt|t-shirt|dress|kurti|jeans|shoe|sneaker|bag|handbag|watch)\b/.test(base);

  // electronics-focused expansion
  if (isElectronics) {
    return [
      base,
      `${base} price`,
      `${base} india`,
      `${base} buy online`,
      `${base} best`,
    ];
  }

  // fashion-focused expansion
  if (isFashion) {
    return [
      base,
      `${base} for men`,
      `${base} for women`,
      `${base} unisex`,
      `${base} latest`,
    ];
  }

  // general expansion (mixed category)
  return [
    base,
    `${base} india`,
    `${base} online`,
    `${base} buy`,
    `${base} best`,
  ];

};

export const searchShoppingProducts = async (query, options = {}) => {

  try {
    const serpApiKey = resolveSerpApiKey(options?.apiKey);
    if (!serpApiKey) {
      console.error("SERPAPI key missing. Set SERPAPI_KEY (or SERPAPI_API_KEY) in backend .env");
      return [];
    }

    const queries = expandQuery(query);

    let allResults = [];

    // Default to primary query first for reliability; extra variants are optional via env.
    for (const q of queries.slice(0, SERPAPI_VARIANT_LIMIT)) {

      console.log("SERPAPI SEARCH QUERY:", q);

      const response = await axios.get(
        "https://serpapi.com/search.json",
        {
          params: {
            engine: "google_shopping",
            q,
            location: "India",
            hl: "en",
            gl: "in",
            api_key: serpApiKey,
          },
          timeout: 30000,
        }
      );

      const results =
        response?.data?.shopping_results ||
        response?.data?.inline_shopping_results ||
        [];

      allResults.push(...results);

    }

    return allResults;

  }
  catch (error) {

    console.log(
      "SERPAPI ERROR:",
      error?.response?.status ||
      error.message
    );
    if (error?.response?.data?.error) {
      console.log("SERPAPI ERROR DETAIL:", error.response.data.error);
    }

    return [];

  }

};

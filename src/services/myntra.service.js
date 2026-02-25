import axios from "axios";

/**
 * Search products on Myntra using RapidAPI (Myntra Price History Tracker)
 * @param {string} query - User search text or Myntra product URL
 * @returns {Array} - List of products or a single product wrapped in an array
 */
export const searchMyntraProducts = async (query) => {
  console.log("MYNTRA SEARCH QUERY:", query);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const host =
    process.env.MYNTRA_API_HOST || "myntra-price-history-tracker.p.rapidapi.com";
  const url =
    process.env.MYNTRA_API_URL || `https://${host}/myntra.php`;

  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": host,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const isUrl = typeof query === "string" && /^https?:\/\//i.test(query);
  const queryText = (query || "").trim();
  const slug = queryText.replace(/\s+/g, "-");
  const myntraSearchUrl =
    queryText.length > 0 ? `https://www.myntra.com/${encodeURIComponent(slug)}` : "";

  const bodyCandidates = [];
  if (isUrl) {
    bodyCandidates.push(new URLSearchParams({ url: queryText }).toString());
  } else {
    // Try sending both "url" and "query" (some RapidAPI apps expect one or the other)
    bodyCandidates.push(
      new URLSearchParams({ url: myntraSearchUrl, query: queryText }).toString()
    );
    // Fallbacks if the API ignores one of the fields
    bodyCandidates.push(new URLSearchParams({ url: myntraSearchUrl }).toString());
    bodyCandidates.push(new URLSearchParams({ query: queryText }).toString());
  }

  const requestWithRetry = async (body) => {
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await axios.post(url, body, { headers, timeout: 30000 });
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        if (status === 429) throw err;
        if (attempt === 3 || ![502, 503, 504].includes(status)) throw err;
        await sleep(500 * attempt);
      }
    }
    throw lastErr;
  };

  try {
    let response;
    for (const body of bodyCandidates) {
      try {
        response = await requestWithRetry(body);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 429) {
          console.warn("MYNTRA QUOTA EXCEEDED: skipping Myntra results");
          return [];
        }
        throw err;
      }

      const extractProducts = (data) =>
        data?.data?.products ||
        data?.data?.productList ||
        data?.data?.items ||
        data?.data?.results ||
        data?.products ||
        data?.productList ||
        data?.items ||
        data?.results ||
        null;

      const products = extractProducts(response.data);

      if (Array.isArray(products)) {
        console.log("MYNTRA RAW DATA RECEIVED", products.length);
        return products;
      }

      if (products && typeof products === "object") {
        console.log("MYNTRA RAW DATA RECEIVED", 1);
        return [products];
      }
    }

    console.log("MYNTRA: NO PRODUCTS RETURNED");
    return [];
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("MYNTRA ERROR:", status || err.message, data || "");
    return [];
  }
};

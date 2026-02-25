import axios from "axios";

/**
 * Search products on Flipkart using RapidAPI
 * @param {string} query - User search text
 * @returns {Array} - List of products
 */
export const searchFlipkartProducts = async (query) => {
  console.log("FLIPKART SEARCH QUERY:", query);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const defaultUrls = [
    "https://real-time-flipkart-data2.p.rapidapi.com/products-by-category",
  ];
  const urlFromEnv = process.env.FLIPKART_API_URL;
  const urlsToTry = urlFromEnv ? [urlFromEnv] : defaultUrls;

  const extractProducts = (data) =>
    data?.data?.products ||
    data?.data?.productList ||
    data?.data?.productsList ||
    data?.data?.items ||
    data?.data?.results ||
    data?.data ||
    data?.products ||
    data?.productList ||
    data?.productsList ||
    data?.items ||
    data?.results ||
    [];

  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host":
      process.env.FLIPKART_API_HOST || "real-time-flipkart-data2.p.rapidapi.com",
  };

  const requestWithRetry = async (requestFn) => {
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await requestFn();
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        if (attempt === 3 || ![429, 502, 503, 504].includes(status)) throw err;
        await sleep(500 * attempt);
      }
    }
    throw lastErr;
  };

  const pickCategoryId = (q) => {
    const queryText = (q || "").toLowerCase();

    if (/(dress|frock|gown|saree|kurta|lehenga|ethnic|skirt)/.test(queryText)) {
      return "clo,odx";
    }
    if (/(shirt|tshirt|tee|top|topwear|jean|pant|trouser|clothing|fashion)/.test(queryText)) {
      return "clo,ash";
    }
    if (/(phone|mobile|smartphone|iphone|android)/.test(queryText)) {
      return "tyy,4io";
    }
    if (/(tablet|ipad)/.test(queryText)) {
      return "tyy,hry";
    }
    if (/(accessor|charger|earphone|headphone|case|cover)/.test(queryText)) {
      return "tyy,4mr";
    }

    return process.env.FLIPKART_CATEGORY_ID || "clo,odx";
  };

  const tryCategoryRequest = async (url, q) => {
    let categoryId = pickCategoryId(q);
    if (!categoryId) return [];
    categoryId = categoryId.replace("/", ",");
    console.log("FLIPKART CATEGORY ID:", categoryId);
    const isFlipkartApis =
      url.includes("flipkart-apis.p.rapidapi.com") ||
      (process.env.FLIPKART_API_HOST || "").includes("flipkart-apis.p.rapidapi.com");

    const response = await requestWithRetry(() =>
      axios.get(url, {
        params: {
          page: 1,
          categoryId,
          categoryID: categoryId,
          ...(isFlipkartApis ? {} : { sortBy: "POPULARITY" }),
        },
        headers,
        timeout: 30000,
      })
    );

    return extractProducts(response.data);
  };

  try {
    for (const url of urlsToTry) {
      try {
        const isCategoryEndpoint =
          url.includes("category-products-list") || url.includes("products-by-category");
        const products = isCategoryEndpoint
          ? await tryCategoryRequest(url, query)
          : await tryCategoryRequest(url, query);
        if (Array.isArray(products) && products.length > 0) {
          console.log("FLIPKART RAW DATA RECEIVED", products.length);
          return products;
        }
      } catch (err) {
        if (err?.response?.status !== 401) throw err;
      }
    }

    const canUseLegacyCategory =
      !process.env.FLIPKART_API_URL &&
      (process.env.FLIPKART_API_HOST || "").includes("real-time-flipkart-data2");

    if (canUseLegacyCategory) {
    const categoryProducts = await tryCategoryRequest(
      "https://real-time-flipkart-data2.p.rapidapi.com/products-by-category",
      query
    );
    if (Array.isArray(categoryProducts) && categoryProducts.length > 0) {
      console.log("FLIPKART RAW DATA RECEIVED (CATEGORY)", categoryProducts.length);
      return categoryProducts;
    }
    }

    console.log("FLIPKART: NO PRODUCTS RETURNED");
    return [];
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("FLIPKART ERROR:", status || err.message, data || "");
    return [];
  }
};

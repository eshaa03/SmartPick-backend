import axios from "axios";

/**
 * Search products on Amazon using RapidAPI
 * @param {string} query - User search text
 * @returns {Array} - List of products
 */
export const searchAmazonProducts = async (query) => {
  console.log("AMAZON SEARCH QUERY:", query);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const url = "https://real-time-amazon-data.p.rapidapi.com/search";
    const options = {
      params: {
        query,
        country: "IN",
        page: 1,
      },
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
      },
      timeout: 30000,
    };

    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.get(url, options);
        break;
      } catch (err) {
        const status = err?.response?.status;
        if (attempt === 3 || ![429, 502, 503, 504].includes(status)) throw err;
        await sleep(500 * attempt);
      }
    }

    const extractProducts = (data) =>
      data?.data?.products ||
      data?.products ||
      data?.data?.search_results ||
      data?.data?.results ||
      data?.data?.items ||
      data?.items ||
      [];

    const products = extractProducts(response.data);

    console.log("AMAZON RAW DATA RECEIVED", Array.isArray(products) ? products.length : 0);

    return Array.isArray(products) ? products : [];
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("AMAZON ERROR:", status || err.message, data || "");
    return [];
  }
};

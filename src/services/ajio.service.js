import axios from "axios";

/**
 * Fetch product details from Ajio via RapidAPI
 * @param {string} productId - Ajio product id (e.g., 441125835_pink)
 * @returns {Object|null} - Product details
 */
export const getAjioProduct = async (productId) => {
  console.log("AJIO PRODUCT ID:", productId);

  const host = process.env.AJIO_API_HOST || "gak-ajio-scraper.p.rapidapi.com";
  const url = `https://${host}/product/${encodeURIComponent(productId)}`;

  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": host,
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.get(url, { headers, timeout: 30000 });
        break;
      } catch (err) {
        const status = err?.response?.status;
        if (attempt === 3 || ![429, 502, 503, 504].includes(status)) throw err;
        await sleep(500 * attempt);
      }
    }

    return response?.data ?? null;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("AJIO ERROR:", status || err.message, data || "");
    return null;
  }
};

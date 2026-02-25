import { searchFlipkartProducts } from "../services/flipkart.service.js";

/**
 * Controller: Search Flipkart products
 * GET /api/flipkart/search?q=phone
 */
export const searchFlipkart = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const products = await searchFlipkartProducts(q);

    res.status(200).json({
      source: "Flipkart",
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Flipkart search failed",
    });
  }
};

import { searchAmazonProducts } from "../services/amazon.service.js";

/**
 * Controller: Search Amazon products
 * GET /api/amazon/search?q=phone
 */
export const searchAmazon = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required"
      });
    }

    const products = await searchAmazonProducts(q);

    res.status(200).json({
      source: "Amazon",
      count: products.length,
      products
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Amazon search failed"
    });
  }
};

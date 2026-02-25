import { getAjioProduct } from "../services/ajio.service.js";

/**
 * Controller: Fetch Ajio product details
 * GET /api/ajio/product/:id
 * GET /api/ajio/product?id=...
 */
export const fetchAjioProduct = async (req, res) => {
  try {
    const productId = req.params.id || req.query.id;

    if (!productId) {
      return res.status(400).json({
        message: "Product id is required",
      });
    }

    const product = await getAjioProduct(productId);

    if (!product) {
      return res.status(404).json({
        message: "Ajio product not found",
      });
    }

    res.status(200).json({
      source: "Ajio",
      product,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Ajio product fetch failed",
    });
  }
};

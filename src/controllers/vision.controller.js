import { searchByImageVision } from "../services/vision.service.js";

export const searchByImage = async (req, res) => {
  try {
    const { image, text_hint: textHint = "", top_k: topK = 24, strict_category: strictCategory } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "Missing image. Send base64/data-url in `image` field.",
      });
    }

    const result = await searchByImageVision({
      imageDataUrl: image,
      textHint: String(textHint || ""),
      topK: Number(topK) || 24,
      strictCategory: typeof strictCategory === "boolean" ? strictCategory : undefined,
    });

    return res.json(result);
  } catch (error) {
    console.error("Vision search error:", error?.message || error);
    return res.status(500).json({
      provider: "vision_search",
      detected_items: [],
      results: [],
    });
  }
};

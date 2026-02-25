import { recommendProductsDiverse } from "../services/recommendation.service.js";

export const getRecommendations = async (req, res) => {
  try {
    const { query } = req.query;
    const serpApiKey =
      req.query.api_key ||
      req.query.serpapi_key ||
      req.headers["x-serpapi-api-key"] ||
      req.headers["x-serpapi-key"] ||
      "";

    if (!query) {
      return res.json([]);
    }

    const topK = Number(req.query.top_k || req.query.topK) || 30;
    const results = await recommendProductsDiverse({ query, topK, serpApiKey });
    res.json(results);
  } catch (error) {
    console.error("❌ Recommendation error:", error);
    res.status(500).json([]);
  }
};

import express from "express";
import { getRecommendations } from "../controllers/recommendation.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getRecommendations);

export default router;

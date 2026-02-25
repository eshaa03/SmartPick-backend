import express from "express";
import { searchFlipkart } from "../controllers/flipkart.controller.js";

const router = express.Router();

/**
 * GET /api/flipkart/search?q=any-product
 */
router.get("/search", searchFlipkart);

export default router;

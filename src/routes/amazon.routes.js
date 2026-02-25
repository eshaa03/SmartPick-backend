import express from "express";
import { searchAmazon } from "../controllers/amazon.controller.js";

const router = express.Router();

/**
 * GET /api/amazon/search?q=any-product
 */
router.get("/search", searchAmazon);

export default router;

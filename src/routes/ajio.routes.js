import express from "express";
import { fetchAjioProduct } from "../controllers/ajio.controller.js";

const router = express.Router();

/**
 * GET /api/ajio/product/:id
 * GET /api/ajio/product?id=...
 */
router.get("/product/:id", fetchAjioProduct);
router.get("/product", fetchAjioProduct);

export default router;

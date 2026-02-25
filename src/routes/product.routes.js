import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addProduct,
  getProducts
} from "../controllers/product.controller.js";

const router = express.Router();

router.post("/", protect, addProduct);
router.get("/", getProducts);

export default router;

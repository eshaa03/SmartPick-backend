import express from "express";
import {
  getAdminStats,
  getAllUsers,
  getAllProducts,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.get("/products", getAllProducts);

export default router;

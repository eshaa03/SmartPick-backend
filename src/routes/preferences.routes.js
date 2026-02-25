import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  savePreferences,
  getPreferences,
  updatePreferences
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/", protect, savePreferences);
router.get("/", protect, getPreferences);
router.put("/", protect, updatePreferences);

export default router;

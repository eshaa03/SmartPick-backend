import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import {
  savePreferences,
  getPreferences,
  updatePreferences,
} from "../controllers/user.controller.js";

const router = express.Router();

/* ---------------- ADMIN: GET ALL USERS ---------------- */
router.get("/", protect, async (req, res) => {
  try {
    // Optional: restrict to admin only
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password");
    res.json(users);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

/* ---------------- USER PREFERENCES ---------------- */
router.post("/preferences", protect, savePreferences);
router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);

export default router;

import express from "express";
import { searchByImage } from "../controllers/vision.controller.js";

const router = express.Router();

router.post("/search-by-image", searchByImage);

export default router;


import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import preferencesRoutes from "./routes/preferences.routes.js";
import amazonRoutes from "./routes/amazon.routes.js";
import flipkartRoutes from "./routes/flipkart.routes.js";
import ajioRoutes from "./routes/ajio.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import visionRoutes from "./routes/vision.routes.js";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://smartpick-3.web.app",
  "https://smartpick-3.firebaseapp.com",
  ...String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools and same-origin calls without an Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/user", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/amazon", amazonRoutes);
app.use("/api/flipkart", flipkartRoutes);
app.use("/api/ajio", ajioRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vision", visionRoutes);


export default app;

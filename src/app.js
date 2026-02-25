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

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

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

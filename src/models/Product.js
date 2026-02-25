import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: String,
  platform: String, // amazon | flipkart | nykaa
  price: Number,
  originalPrice: Number,
  rating: Number,
  reviews: Number,
  image: String,
  productUrl: String,
  features: [String],
  category: String,
});

export default mongoose.model("Product", productSchema);

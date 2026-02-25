import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: String,
  maxPrice: Number,
  minRating: Number,
  tags: [String]
});

export default mongoose.model("Preference", preferenceSchema);

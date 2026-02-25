import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" },
    preferences: Object
  },
  { timestamps: true }   // ✅ THIS IS THE FIX
);

export default mongoose.model("User", userSchema);

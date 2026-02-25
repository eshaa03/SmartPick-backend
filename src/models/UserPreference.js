import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  textInput: { type: Boolean, default: true },
  voiceInput: { type: Boolean, default: true },
  imageInput: { type: Boolean, default: true },        // ✅ changed
  notifications: { type: Boolean, default: true },    // ✅ changed
  darkMode: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("UserPreference", userPreferenceSchema);

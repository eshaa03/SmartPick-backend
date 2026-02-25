import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number
      }
    ],
    totalAmount: Number,
    status: {
      type: String,
      default: "Completed"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

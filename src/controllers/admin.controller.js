import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// 📊 Get Dashboard Stats
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const orders = await Order.find();
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    const activeQueries = 0; // update if you store queries

    res.json({
      totalUsers,
      totalProducts,
      totalRevenue,
      activeQueries,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
};

// 👥 Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// 📦 Get All Products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
};

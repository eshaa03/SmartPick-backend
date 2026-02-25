import Order from "../models/Order.js";
import Product from "../models/Product.js";

export const createOrder = async (req, res) => {
  const { products } = req.body;

  let total = 0;

  for (let item of products) {
    const product = await Product.findById(item.productId);
    total += product.price * item.quantity;
  }

  const order = await Order.create({
    userId: req.user.id,
    products,
    totalAmount: total
  });

  res.status(201).json(order);
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ userId: req.user.id })
    .populate("products.productId");

  res.json(orders);
};

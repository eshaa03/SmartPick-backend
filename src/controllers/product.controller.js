import Product from "../models/Product.js";

export const addProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

export const getProducts = async (req, res) => {
  const { category, maxPrice } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (maxPrice) filter.price = { $lte: maxPrice };

  const products = await Product.find(filter);
  res.json(products);
};

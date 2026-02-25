import bcrypt from "bcryptjs";
import User from "../models/User.js";

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Admin seed skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing");
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log("Admin role updated for existing user");
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    name: "Admin",
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
  });

  console.log("Admin user seeded");
};

export default seedAdmin;

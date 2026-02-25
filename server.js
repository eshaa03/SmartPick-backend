import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import seedAdmin from "./src/config/seedAdmin.js";

connectDB().then(seedAdmin);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SmartPick API running on port ${PORT}`);
});

const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoURL =
    process.env.NODE_ENV === "test"
      ? process.env.MONGO_URI_TEST
      : process.env.MONGO_URI;

  if (!mongoURL) {
    console.error("Error: MongoDB connection URI not found in .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURL);
    console.log(
      `🛡  ${
        process.env.NODE_ENV === "test" ? "Test " : "Production "
      }MongoDB connected successfully 🛡`
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;

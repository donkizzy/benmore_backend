const app = require("./app");
const connectDB = require("./config/db");

const startServer = async () => {
  const PORT = process.env.PORT || 3000;

  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();

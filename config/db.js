const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://amosgodwin500:amgTCAXR19inQnQw@benmoredb.cwoznfl.mongodb.net/?retryWrites=true&w=majority&appName=benmoreDb');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
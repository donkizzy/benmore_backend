const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const user = new User(req.body);
    try {
      const newUser = await user.save();
      res.status(200).json(newUser);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
  // Login logic
};

exports.getUser = async (req, res) => {
  // Get user logic
};

exports.updateUser = async (req, res) => {
  // Update user logic
};

exports.deleteUser = async (req, res) => {
  // Delete user logic
};
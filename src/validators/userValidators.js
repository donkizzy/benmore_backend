const { body } = require("express-validator");

exports.registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").trim().isEmail().withMessage("Invalid email address"),
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

exports.loginValidation = [
  body("email").trim().isEmail().withMessage("Invalid email address"),
  body("password").trim().notEmpty().withMessage("Password is required"),
];

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {
  registerValidation,
  loginValidation,
} = require("../validators/userValidators");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/register", registerValidation, userController.register);
router.post("/login", loginValidation, userController.login);
router.get("/:id", auth, userController.getUser);
router.put("/:id", upload.single("file"), auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);
router.post("/toggleFollow/:id", auth, userController.toggleFollowUser);
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/reset-password", userController.resetPassword);

module.exports = router;

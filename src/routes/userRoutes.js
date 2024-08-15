const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { registerValidation, loginValidation } = require('../validators/userValidators');
const auth = require('../middleware/auth');



router.post('/register', registerValidation, userController.register);
router.post('/login', loginValidation, userController.login);
router.get('/:id', auth, userController.getUser);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);
router.post('/user/follow/:id', auth, userController.followUser);
router.post('/user/unfollow/:id', auth, userController.unfollowUser);
router.post('/request-password-reset', userController.requestPasswordReset);
router.post('/reset-password', userController.resetPassword);

module.exports = router;
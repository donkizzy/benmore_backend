const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

router.post('/', auth, postController.createPost);
router.get('/:id',auth ,postController.getPost);
router.put('/:id', auth ,postController.updatePost);
router.delete('/:id', auth ,postController.deletePost);
router.post('/comment', auth , postController.createComment);
router.get('/:id/comment', auth , postController.getCommentsForPost);
router.post('/:id/toggleLike',auth , postController.toggleLike); 

module.exports = router;
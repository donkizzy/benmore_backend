const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload'); 


router.post('/', upload.single('file'), auth, postController.createPost);
router.get('/:id',auth ,postController.getPost);
router.put('/:id', upload.single('file'), auth ,postController.updatePost);
router.delete('/:id', auth ,postController.deletePost);
router.post('/comment', auth , postController.createComment);
router.get('/:id/comment', auth , postController.getCommentsForPost);
router.post('/:id/toggleLike',auth , postController.toggleLike); 

module.exports = router;
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.get('/', postController.index);
router.get('/blogposts/new', postController.getNewPost);
router.post('/blogposts/store', postController.storePost);
router.get('/blogposts/:id', postController.getDetailPost);

// Các route mở rộng cho Sửa và Xóa 
router.get('/blogposts/edit/:id', postController.editPost);
router.post('/blogposts/update/:id', postController.updatePost);
router.get('/blogposts/delete/:id', postController.deletePost);

module.exports = router;
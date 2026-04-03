const BlogPost = require('../models/BlogPost');

// 1. Xem danh sách + Tìm kiếm (Mở rộng)
exports.index = async (req, res) => {
    const searchQuery = req.query.search || "";
    // Tìm bài theo tiêu đề và sắp xếp bài mới nhất lên trên 
    const posts = await BlogPost.find({
        title: { $regex: searchQuery, $options: 'i' }
    }).sort({ createdAt: -1 });
    
    res.render('index', { posts, searchQuery });
};

// 2. Hiển thị form tạo mới 
exports.getNewPost = (req, res) => {
    res.render('create');
};

// 3. Lưu bài viết mới 
exports.storePost = async (req, res) => {
    await BlogPost.create({
        title: req.body.title, 
        body: req.body.body    
    });
    res.redirect('/');
};

// 4. Xem chi tiết 
exports.getDetailPost = async (req, res) => {
    const post = await BlogPost.findById(req.params.id);
    res.render('detail', { post });
};

// 5. Mở rộng: Chức năng Sửa bài 
exports.editPost = async (req, res) => {
    const post = await BlogPost.findById(req.params.id);
    res.render('edit', { post });
};

exports.updatePost = async (req, res) => {
    await BlogPost.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        body: req.body.body
    });
    res.redirect(`/blogposts/${req.params.id}`);
};

// 6. Mở rộng: Chức năng Xóa bài 
exports.deletePost = async (req, res) => {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.redirect('/');
};
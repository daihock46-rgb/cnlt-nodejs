const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlogPostSchema = new Schema({
    title: String,
    body: String, 
    createdAt: { type: Date, default: Date.now } // Mở rộng: Tự động lưu ngày đăng
});

const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
module.exports = BlogPost; 
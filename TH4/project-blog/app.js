const express = require('express');
const mongoose = require('mongoose');
const BlogPost = require('./models/BlogPost');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
mongoose.connect('mongodb://127.0.0.1:27017/blogDB')
.then(() => console.log('Kết nối MongoDB thành công'))
.catch((error) => console.log(error));


app.get('/', async (req, res) => {
    const posts = await BlogPost.find({}).sort({ createdAt: -1 }); // 👈 sửa ở đây
    res.render('index', { posts });
});
app.get('/blogposts/new', (req, res) => {
res.render('create');
});
app.post('/blogposts/store', async (req, res) => {
await BlogPost.create({
title: req.body.title,
body: req.body.body
});
res.redirect('/');
});
app.get('/blogposts/:id', async (req, res) => {
const post = await BlogPost.findById(req.params.id);
res.render('detail', { post });
});
app.listen(3000, () => {
console.log('Server đang chạy tại http://localhost:3000');
});


/////
app.get('/blogposts/edit/:id', async (req, res) => {
    const post = await BlogPost.findById(req.params.id);
    res.render('edit', { post });
});


app.post('/blogposts/update/:id', async (req, res) => {
    await BlogPost.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        body: req.body.body
    });
    res.redirect('/');
});


app.get('/blogposts/delete/:id', async (req, res) => {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.redirect('/');
});

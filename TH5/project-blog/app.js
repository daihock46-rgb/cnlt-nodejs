const express = require('express');
const connectDB = require('./config/db');
const postRoutes = require('./routes/postRoutes');
const app = express();

// Kết nối Database
connectDB();

// Cấu hình Middleware & View Engine
app.use(express.urlencoded({ extended: true })); // [cite: 57]
app.set('view engine', 'ejs'); // [cite: 41]
app.use(express.static('public')); // Cấu hình thư mục chứa CSS

// Sử dụng Routes
app.use('/', postRoutes);

app.listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000');
});
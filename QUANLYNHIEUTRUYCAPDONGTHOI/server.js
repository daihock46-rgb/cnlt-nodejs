const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session'); // Yêu cầu sử dụng session [cite: 6, 27]

const app = express();
const dataPath = path.join(__dirname, 'data.json');

// 1. Cấu hình Middleware (BẮT BUỘC ĐẶT TRƯỚC CÁC ROUTE)
app.use(express.json());
app.use(session({
    secret: 'chuoi-bi-mat-cua-minh', // Chuỗi mã hóa session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Để false khi chạy localhost
}));

// --- BÀI 1: QUẢN LÝ SINH VIÊN (Mục 12, 36) ---
app.get('/students', (req, res) => {
    const students = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || students.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    res.json(students.slice(startIndex, endIndex));
});

// --- BÀI 2: BLOCKING VS NON-BLOCKING (Mục 24, 25) ---
app.get('/async', (req, res) => {
    console.log("1. Bắt đầu đọc file (Asynchronous)"); 
    fs.readFile(dataPath, 'utf8', (err, data) => {
        console.log("3. Đã đọc xong file (Nằm trong Callback)"); 
    });
    console.log("2. Lệnh này chạy ngay lập tức (Non-blocking)"); 
    res.send("Kiểm tra Terminal để thấy cơ chế Non-blocking");
});

// --- BÀI 3: SESSION (Mục 27, 28, 29) ---
// Giả lập POST /login thành GET /login-test để dễ dùng trình duyệt
app.get('/login-test', (req, res) => {
    // Tài khoản mặc định: admin / 123456 [cite: 31]
    req.session.user = { username: 'admin', role: 'quan-tri' };
    res.send("Đăng nhập thành công! Hãy truy cập /profile"); 
});

app.get('/profile', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).send("Bạn chưa đăng nhập!");
    }
});

app.listen(3000, () => console.log('Server đang chạy tại http://localhost:3000'));
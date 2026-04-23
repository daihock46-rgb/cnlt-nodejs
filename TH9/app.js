const express = require('express');
const session = require('express-session');
const logger = require('./middleware/logger');
const { requireLogin } = require('./middleware/auth');
const authCtrl = require('./controllers/authController');
const studentCtrl = require('./controllers/studentController');
const heavyCtrl = require('./controllers/heavyController');

const app = express();
app.use(express.json());
app.use(logger);

app.use(session({
    secret: 'bi-mat-quoc-gia',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Để false khi test localhost
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Route Xác thực
app.post('/login', authCtrl.login);
app.post('/logout', authCtrl.logout);

// Route Sinh viên (Cần đăng nhập)
app.get('/students', requireLogin, studentCtrl.getAllStudents);
app.post('/students', requireLogin, studentCtrl.createStudent);
app.delete('/students/:id', requireLogin, studentCtrl.deleteStudent);
app.get('/students/stats', requireLogin, studentCtrl.getStats);
app.get('/students/stats/class', requireLogin, studentCtrl.getStatsByClass);

// Route Hiệu năng
app.get('/heavy-sync', heavyCtrl.heavySync);
app.get('/heavy-async', heavyCtrl.heavyAsync);

// Xử lý lỗi chung
app.use((err, req, res, next) => {
    res.status(500).json({ error: "Có lỗi xảy ra trên server!" });
});

app.listen(3000, () => console.log('Server đang chạy tại: http://localhost:3000'));
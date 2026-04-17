const express = require("express");
const multer = require("multer");
const fs = require("fs"); // Thêm module fs để xử lý file/thư mục hệ thống
const app = express();

// TỰ ĐỘNG: Kiểm tra và tạo thư mục 'uploads' nếu chưa có để tránh lỗi sập server
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const uploadMany = multer({ storage: storage }).array("file", 17);
const upload = multer({ storage: storage }).single("file");

// Route hiển thị giao diện đẹp
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Siêu Cấp Upload</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
            }
            .upload-container {
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                text-align: center;
                width: 350px;
            }
            h2 { color: #333; margin-bottom: 20px; }
            input[type="file"] {
                margin-bottom: 20px;
                display: block;
                width: 100%;
                padding: 10px;
                border: 1px dashed #764ba2;
                border-radius: 5px;
                cursor: pointer;
                box-sizing: border-box; /* Sửa lỗi tràn viền input */
            }
            button {
                background: #764ba2;
                color: white;
                border: none;
                padding: 12px 25px;
                font-size: 16px;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
                width: 100%;
                box-sizing: border-box;
            }
            button:hover {
                background: #667eea;
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            button:active {
                transform: translateY(0);
            }
        </style>
    </head>
    <body>
        <div class="upload-container">
            <h2>Tải File Lên</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="file" required /> <button type="submit">Bắt đầu Upload</button>
            </form>
        </div>
    </body>
    </html>
    `);
});

// Route xử lý upload 
app.post("/upload", (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h2 style="color: red;">Lỗi rồi ông ơi: ${err.message || err}</h2>
                <a href="/" style="text-decoration: none; color: #764ba2; font-weight: bold;">Quay lại</a>
            </div>
        `);
        
        // Bắt thêm lỗi nếu người dùng nhấn nút nhưng chưa có file (dù đã chặn ở HTML bằng required)
        if (!req.file) {
            return res.send(`
                <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                    <h2 style="color: orange;">Bạn chưa chọn file nào cả!</h2>
                    <a href="/" style="text-decoration: none; color: #764ba2; font-weight: bold;">Quay lại</a>
                </div>
            `);
        }

        res.send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h2 style="color: #4CAF50;">🎉 Chúc mừng! File đã lên kệ thành công!</h2>
                <p>Tên file đã lưu: <strong>${req.file.filename}</strong></p>
                <a href="/" style="text-decoration: none; color: #764ba2; font-weight: bold;">Tiếp tục tải file khác?</a>
            </div>
        `);
    });
});

app.listen(8080, () => {
    console.log("Server cực đẹp đang chạy tại http://localhost:8080");
});
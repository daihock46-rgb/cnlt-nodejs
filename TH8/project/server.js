const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Thêm fs để kiểm tra thư mục
const app = express();

// Đảm bảo thư mục uploads tồn tại để không bị lỗi crash server
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

// Giới hạn 17 files - Tên field phải khớp với tên trong thẻ input (name="file")
const uploadMany = multer({ storage: storage }).array("file", 17);

app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>BÀI THỰC HÀNH SỐ 8</title>
        <style>
           
            body { font-family: sans-serif; background: #f2f7c9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .upload-container { background: white; padding: 40px; border-radius: 15px; text-align: center; }
            button { cursor: pointer; background: #6046f4; color: white; border: none; padding: 10px 20px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="upload-container">
            <h2>Tải File Lên</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="file" multiple /> 
                <button type="submit">Bắt đầu tải lên</button>
            </form>
        </div>
    </body>
    </html>
    `);
});

// Route xử lý upload
app.post("/upload", (req, res) => {
    // SỬ DỤNG uploadMany thay vì upload
    uploadMany(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Lỗi của riêng Multer (VD: quá 17 file)
            return res.send(`<h2 style="color: red;">Lỗi Multer: ${err.message} (Chỉ được tối đa 17 file)</h2><a href="/">Quay lại</a>`);
        } else if (err) {
            return res.send(`<h2 style="color: red;">Lỗi rồi: ${err}</h2><a href="/">Quay lại</a>`);
        }

        // Kiểm tra xem có file nào được chọn không
        if (!req.files || req.files.length === 0) {
            return res.send(`<h2>Bạn chưa chọn file nào!</h2><a href="/">Quay lại</a>`);
        }

        res.send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h2 style="color: #4CAF50;">🎉 Thành công! Đã tải lên ${req.files.length} file.</h2>
                <a href="/" style="text-decoration: none; color: #7070dc; font-weight: bold;">Tiếp tục?</a>
            </div>
        `);
    });
});

app.listen(8017, () => {
    console.log("Server đang chạy tại http://localhost:8017");
});
// server.js
const http = require('http');
const url = require('url');
const fs = require('fs');

const server = http.createServer((req, res) => {
    let urlData = url.parse(req.url, true);
    let fileName = './views' + urlData.pathname;
    
    // Nếu truy cập trang chủ (đường dẫn "/") thì trỏ về index.html
    if(urlData.pathname === '/') {
        fileName = './views/index.html';
    }

    // Đọc file theo đường dẫn
    fs.readFile(fileName, (err, data) => {
        if(err) {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.write('404 Not Found');
            return res.end();
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
});

server.listen(8017, 'localhost');
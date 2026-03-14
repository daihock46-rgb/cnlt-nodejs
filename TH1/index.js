const http = require('http')

const server = http.createServer((req, res) => {

    if(req.url === "/"){
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'})
        res.end("Trang chủ")
    }

    else if(req.url === "/about"){
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'})
        res.end("Trang giới thiệu")
    }

    else if(req.url === "/contact"){
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'})
        res.end("Trang liên hệ")
    }

    else{
        res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'})
        res.end("Không tìm thấy trang")
    }

})

server.listen(3000, () => {
    console.log("Server đang chạy tại port 3000")
})
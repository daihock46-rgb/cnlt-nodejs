const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const appEmitter = require('./events/AppEmitter');
const TextTransform = require('./streams/TextTransform');
const EchoDuplex = require('./streams/EchoDuplex');

const PORT = 3000;

function serveHTML(res, filename) {
    const filePath = path.join(__dirname, 'views', filename);
    const readStream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    readStream.pipe(res);
    readStream.on('error', () => { res.writeHead(404); res.end('404 Not Found'); });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'GET') {
        if (pathname === '/') serveHTML(res, 'index.html');
        else if (pathname === '/streams') serveHTML(res, 'streams.html');
        else if (pathname === '/request') serveHTML(res, 'request.html');
        else if (pathname === '/events') serveHTML(res, 'events.html');
        
        else if (pathname === '/json') {
            const notePath = path.join(__dirname, 'data', 'notes.txt');
            fs.readFile(notePath, 'utf8', (err, data) => {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                if (err || !data) return res.end(JSON.stringify([])); 
                const notes = data.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
                res.end(JSON.stringify(notes));
            });
        }
        
        else if (pathname === '/api/events') {
            const eventPath = path.join(__dirname, 'data', 'event_log.txt');
            fs.readFile(eventPath, 'utf8', (err, data) => {
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(data || '');
            });
        }

        else if (pathname === '/api/request-info') {
            res.setHeader('X-Powered-By', 'Note-Taking-App');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify({ url: req.url, method: req.method, query: parsedUrl.query, headers: req.headers, resHeaders: res.getHeaders() }));
        }

        else if (pathname === '/download-log') {
            const notePath = path.join(__dirname, 'data', 'notes.txt');
            res.setHeader('Content-Disposition', 'attachment; filename=sao_luu_ghi_chu.txt');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            fs.createReadStream(notePath).pipe(res);
        }

        else if (pathname === '/transform') {
            const notePath = path.join(__dirname, 'data', 'notes.txt');
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            fs.createReadStream(notePath).pipe(new TextTransform()).pipe(res);
        }

        else if (pathname === '/image') {
            const imageName = parsedUrl.query.name;
            const imagePath = path.join(__dirname, 'public/images', imageName);
            const readStream = fs.createReadStream(imagePath);
            res.writeHead(200, { 'Content-Type': imageName.endsWith('.png') ? 'image/png' : 'image/jpeg' });
            readStream.pipe(res);
            readStream.on('error', () => { res.writeHead(404); res.end('Image not found'); });
        }
        else { res.writeHead(404); res.end('404 Not Found'); }
    } 
    
    else if (method === 'POST') {
        if (pathname === '/streams') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const id = Date.now().toString();
                    const imageName = `${id}_1.${data.ext}`; 

                    fs.createWriteStream(path.join(__dirname, 'public/images', imageName)).write(Buffer.from(data.imageBase64, 'base64'));
                    
                    const logEntry = { id, date: new Date().toLocaleString('vi-VN'), title: data.title, content: data.content, images: [imageName] };
                    const notePath = path.join(__dirname, 'data', 'notes.txt');
                    const noteStream = fs.createWriteStream(notePath, { flags: 'a' });
                    noteStream.write(JSON.stringify(logEntry) + '\n');
                    noteStream.end();

                    appEmitter.emit('new_note', id, data.title);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) { res.writeHead(500); res.end('Server Error'); }
            });
        }
        
        else if (pathname === '/duplex') {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            req.pipe(new EchoDuplex()).pipe(res);
        }
    }
});

server.listen(PORT, () => {
    console.log(`Trạm Ghi Chú đang chạy tại: http://localhost:${PORT}`);
});
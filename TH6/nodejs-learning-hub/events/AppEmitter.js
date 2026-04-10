const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AppEmitter extends EventEmitter {
    constructor() {
        super();
        
        // Lắng nghe sự kiện tạo ghi chú mới
        this.on('new_note', (id, title) => {
            const time = new Date().toLocaleString('vi-VN');
            const logMessage = `[${time}] SỰ KIỆN: Đã tạo ghi chú mới 🌸 - ID: ${id} - Tiêu đề: "${title}"\n`;
            
            console.log(logMessage);
            
            const logPath = path.join(__dirname, '../data/event_log.txt');
            fs.appendFile(logPath, logMessage, (err) => {
                if (err) console.error("Lỗi khi ghi log hệ thống:", err);
            });
        });
    }
}

module.exports = new AppEmitter();
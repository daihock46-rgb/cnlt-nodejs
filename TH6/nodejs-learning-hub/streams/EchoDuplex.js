const { Duplex } = require('stream');

class EchoDuplex extends Duplex {
    constructor(options) {
        super(options);
        this.buffer = [];
    }

    // Ghi dữ liệu vào stream
    _write(chunk, encoding, callback) {
        this.buffer.push(chunk);
        callback(); 
    }

    // Đọc dữ liệu từ stream ra
    _read(size) {
        if (this.buffer.length > 0) {
            this.push(this.buffer.shift()); 
        } else {
            this.push(null); 
        }
    }
}

module.exports = EchoDuplex;
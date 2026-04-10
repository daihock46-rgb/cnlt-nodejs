const { Transform } = require('stream');

class TextTransform extends Transform {
    constructor(options) { super(options); }

    _transform(chunk, encoding, callback) {
        let text = chunk.toString('utf8');
        // Chuyển in hoa và ẩn ID ghi chú
        text = text.toUpperCase();
        text = text.replace(/"ID":"\d+"/g, '"ID":"***BẢO MẬT***"');
        this.push(text);
        callback();
    }
}
module.exports = TextTransform;
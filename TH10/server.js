const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e7 });

app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'database.json');
const badWords = ['dm', 'vcl', 'đm', 'chửi thề', 'ngu', 'fuck'];

let db = { users: {}, histories: {}, rooms: ['Nhóm chung'], roomNames: {}, nicknames: {} };

if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        if (data) db = JSON.parse(data);
    } catch(e) {}
}

const saveDB = () => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch(e) {} };

const profanityFilter = (text) => {
    let filtered = text;
    badWords.forEach(word => { filtered = filtered.replace(new RegExp(word, 'gi'), '***'); });
    return filtered;
};

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.username = username; socket.join('Nhóm chung');
        if (!db.users[username]) db.users[username] = { deletedRooms: {} };
        if (!db.users[username].deletedRooms) db.users[username].deletedRooms = {};
        db.users[username].status = 'online'; db.users[username].socketId = socket.id;
        saveDB();
        io.emit('update_system', { users: db.users, rooms: db.rooms, roomNames: db.roomNames, nicknames: db.nicknames });
        socket.emit('load_histories', db.histories);
    });

    socket.on('send_message', (data) => {
        if (!socket.username) return;
        const timeStr = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
        const isGroup = db.rooms.includes(data.receiver);
        const roomKey = isGroup ? data.receiver : [socket.username, data.receiver].sort().join('_');
        
        const msgData = {
            id: Date.now().toString(36), roomKey, sender: socket.username, receiver: data.receiver,
            type: data.type, content: data.type === 'text' ? profanityFilter(data.content) : data.content,
            fileName: data.fileName || null, replyTo: data.replyTo || null, time: timeStr, timestamp: Date.now(), 
            status: 'sent', reactions: {}, pinned: false
        };

        if (!db.histories[roomKey]) db.histories[roomKey] = [];
        db.histories[roomKey].push(msgData); saveDB();

        if (isGroup) io.emit('receive_message', msgData);
        else {
            if (db.users[data.receiver]?.socketId) io.to(db.users[data.receiver].socketId).emit('receive_message', msgData);
            socket.emit('receive_message', msgData); 
        }
    });

    socket.on('mark_read', ({ roomKey, reader }) => {
        if (db.histories[roomKey]) {
            let changed = false;
            db.histories[roomKey].forEach(msg => { if (msg.sender !== reader && msg.status !== 'seen') { msg.status = 'seen'; changed = true; } });
            if (changed) { saveDB(); io.emit('update_message_meta', { roomKey, history: db.histories[roomKey] }); }
        }
    });

    // --- FIX: GỬI LẠI TOÀN BỘ HISTORY MỚI KHI THẢ TIM & GHIM ---
    socket.on('react_message', ({ roomKey, msgId, emoji }) => {
        const msg = db.histories[roomKey]?.find(m => m.id === msgId);
        if (msg) {
            if (!msg.reactions) msg.reactions = {}; // Bảo vệ lỗi thiếu dữ liệu
            if (msg.reactions[socket.username] === emoji) delete msg.reactions[socket.username];
            else msg.reactions[socket.username] = emoji;
            saveDB();
            // Gửi dữ liệu mới nhất (history) về
            io.emit('update_message_meta', { roomKey, history: db.histories[roomKey] }); 
        }
    });

    socket.on('pin_message', ({ roomKey, msgId }) => {
        if (db.histories[roomKey]) {
            db.histories[roomKey].forEach(m => m.pinned = (m.id === msgId ? !m.pinned : false)); 
            saveDB();
            // Gửi dữ liệu mới nhất (history) về
            io.emit('update_message_meta', { roomKey, history: db.histories[roomKey] }); 
        }
    });
    // --------------------------------------------------------

    socket.on('typing', (data) => {
        const isGroup = db.rooms.includes(data.receiver);
        if (isGroup) socket.broadcast.emit('user_typing', { sender: socket.username, receiver: data.receiver, isTyping: data.isTyping, isGroup: true });
        else { if (db.users[data.receiver]?.socketId) io.to(db.users[data.receiver].socketId).emit('user_typing', { sender: socket.username, receiver: socket.username, isTyping: data.isTyping, isGroup: false }); }
    });

    socket.on('delete_conversation', (roomKey) => {
        if (!socket.username || !db.users[socket.username]) return;
        if (!db.users[socket.username].deletedRooms) db.users[socket.username].deletedRooms = {};
        db.users[socket.username].deletedRooms[roomKey] = Date.now(); saveDB();
        io.emit('update_system', { users: db.users, rooms: db.rooms, roomNames: db.roomNames, nicknames: db.nicknames });
        socket.emit('load_histories', db.histories); 
    });

    ['create_room', 'add_member', 'rename_room', 'set_nickname'].forEach(event => {
        socket.on(event, (data) => {
            if(event==='create_room' && !db.rooms.includes(data)) db.rooms.push(data);
            if(event==='rename_room') db.roomNames[data.roomKey] = data.newName;
            if(event==='set_nickname') {
                if(!db.nicknames[data.roomKey]) db.nicknames[data.roomKey] = {};
                if(data.nickname.trim()==='') delete db.nicknames[data.roomKey][data.targetUser]; else db.nicknames[data.roomKey][data.targetUser] = data.nickname;
            }
            saveDB(); io.emit('update_system', { users: db.users, rooms: db.rooms, roomNames: db.roomNames, nicknames: db.nicknames });
            if(event==='add_member' && db.users[data.targetUser]?.socketId) io.to(db.users[data.targetUser].socketId).emit('force_update_room', data.room);
        });
    });

    socket.on('disconnect', () => {
        if (socket.username && db.users[socket.username]) {
            db.users[socket.username].status = 'offline'; db.users[socket.username].lastActive = Date.now(); saveDB();
            io.emit('update_system', { users: db.users, rooms: db.rooms, roomNames: db.roomNames, nicknames: db.nicknames });
        }
    });
});

server.listen(3000, () => console.log('✅ Server đang chạy!'));
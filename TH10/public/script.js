const socket = io();

let currentUsername = '';
let currentTarget = 'Nhóm chung';
let localDB = { users: {}, rooms: [], roomNames: {}, nicknames: {} };
let localHistories = {};
let unreadCounts = {};
let replyingTo = null;
let typingTimer;
let targetReactMsg = null;
const sounds = { toggle: true, volume: 1, type: 'sound-ting' };

// Bắt chính xác toàn bộ ID HTML
const els = {
    loginScreen: document.getElementById('login-screen'), 
    chatScreen: document.getElementById('chat-screen'),
    usernameInput: document.getElementById('username-input'), 
    joinBtn: document.getElementById('join-btn'),
    onlineUsersList: document.getElementById('online-users'), 
    roomList: document.getElementById('room-list'),
    chatBox: document.getElementById('chat-box'), 
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'), 
    fileUpload: document.getElementById('file-upload'),
    typingIndicator: document.getElementById('typing-indicator'), 
    targetName: document.getElementById('current-target-name'),
    targetStatus: document.getElementById('target-status'), 
    pinnedBar: document.getElementById('pinned-bar'),
    replyBar: document.getElementById('reply-bar'),
    replyText: document.getElementById('reply-text'), 
    modal: document.getElementById('common-modal'),
    modalTitle: document.getElementById('modal-title'), 
    modalBody: document.getElementById('modal-body'),
    reactPopup: document.getElementById('reaction-popup'),
    emojiPicker: document.getElementById('emoji-picker'),
    emojiToggle: document.getElementById('emoji-toggle')
};

function getRoomKey(target) { return localDB.rooms.includes(target) ? target : [currentUsername, target].sort().join('_'); }
function getDisplayName(roomKey, username) { return (localDB.nicknames[roomKey] && localDB.nicknames[roomKey][username]) ? localDB.nicknames[roomKey][username] : username; }
function getRoomName(roomKey) { return localDB.roomNames[roomKey] || roomKey; }

document.getElementById('toggle-room-btn').onclick = function() {
    els.roomList.classList.toggle('collapsed');
    this.querySelector('.toggle-icon').classList.toggle('collapsed');
};
document.getElementById('toggle-user-btn').onclick = function() {
    els.onlineUsersList.classList.toggle('collapsed');
    this.querySelector('.toggle-icon').classList.toggle('collapsed');
};

els.joinBtn.onclick = () => {
    const name = els.usernameInput.value.trim();
    if (name) {
        // --- BẮT ĐẦU: HACK MỞ KHÓA ÂM THANH TRÌNH DUYỆT ---
        const audio = document.getElementById(sounds.type);
        if (audio) {
            audio.volume = 0; // Tắt tiếng tạm thời để không phát ra tiếng ồn lúc đăng nhập
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = parseFloat(sounds.volume); // Trả lại mức âm lượng chuẩn
            }).catch(e => console.log("Lỗi mở khóa", e));
        }
        // --- KẾT THÚC HACK ---

        currentUsername = name; socket.emit('join', name);
        els.loginScreen.style.display = 'none'; els.chatScreen.style.display = 'flex';
        document.getElementById('my-name').textContent = name;
        document.getElementById('my-avatar').textContent = name.charAt(0).toUpperCase();
    }
};

els.usernameInput.onkeypress = (e) => { if (e.key === 'Enter') els.joinBtn.click(); };

socket.on('update_system', (data) => { 
    localDB = data; 
    renderSidebar(); 
    if(currentTarget) loadChatBox(); 
});

socket.on('force_update_room', (room) => { 
    alert(`🔔 Bạn đã được thêm vào nhóm: ${room}`); 
    switchTarget(room);
});

function renderSidebar() {
    els.roomList.innerHTML = '';
    localDB.rooms.forEach(room => {
        const badge = unreadCounts[room] ? `<span class="unread-badge">${unreadCounts[room]}</span>` : '';
        const li = document.createElement('li');
        li.className = currentTarget === room ? 'active' : '';
        li.innerHTML = `<span class="text-truncate">🏠 ${getRoomName(room)}</span> ${badge}`;
        li.onclick = () => switchTarget(room);
        els.roomList.appendChild(li);
    });

    els.onlineUsersList.innerHTML = '';
    const now = Date.now();
    Object.keys(localDB.users).forEach(user => {
        if (user !== currentUsername) {
            const badge = unreadCounts[user] ? `<span class="unread-badge">${unreadCounts[user]}</span>` : '';
            const status = localDB.users[user].status;
            const dotColor = status === 'online' ? '#00b894' : '#b2bec3';
            
            const li = document.createElement('li');
            li.className = currentTarget === user ? 'active' : '';
            li.innerHTML = `<div style="display:flex; align-items:center;" class="text-truncate">
                <span style="background:${dotColor}; width:8px; height:8px; border-radius:50%; margin-right:8px;"></span> 
                ${getDisplayName(getRoomKey(user), user)}</div> ${badge}`;
            li.onclick = () => switchTarget(user);
            els.onlineUsersList.appendChild(li);

            if (currentTarget === user) {
                if (status === 'online') els.targetStatus.textContent = 'Đang hoạt động';
                else {
                    const diff = Math.floor((now - localDB.users[user].lastActive) / 60000);
                    els.targetStatus.textContent = diff < 1 ? 'Vừa truy cập' : `Hoạt động ${diff} phút trước`;
                }
            }
        }
    });

    els.targetName.textContent = localDB.rooms.includes(currentTarget) ? getRoomName(currentTarget) : getDisplayName(getRoomKey(currentTarget), currentTarget);
    if (localDB.rooms.includes(currentTarget)) els.targetStatus.textContent = 'Nhóm chat';
}

// ----------------------------------------------------
// KHU VỰC FIX LỖI GIẬT LAG & LIỆT NÚT GHIM
// ----------------------------------------------------

function switchTarget(target) {
    currentTarget = target;
    unreadCounts[target] = 0;
    els.chatBox.innerHTML = ''; // CHỈ xóa trắng khi chuyển qua lại giữa những người khác nhau
    socket.emit('mark_read', { roomKey: getRoomKey(currentTarget), reader: currentUsername });
    renderSidebar();
    loadChatBox();
    els.messageInput.focus();
}

function loadChatBox() {
    const roomKey = getRoomKey(currentTarget);
    const history = localHistories[roomKey] || [];
    
    const userDeletedTime = localDB.users[currentUsername]?.deletedRooms?.[roomKey] || 0;
    const validHistory = history.filter(msg => msg.timestamp > userDeletedTime);

    // CẬP NHẬT THANH GHIM ĐÚNG CHUẨN ẢNH (Chữ đỏ, Nền vàng)
    const pinnedMsg = validHistory.find(m => m.pinned);
    els.pinnedBar.style.display = pinnedMsg ? 'flex' : 'none';
    if(pinnedMsg) {
        const textGhim = pinnedMsg.type === 'text' ? pinnedMsg.content : `[Đính kèm]`;
        els.pinnedBar.innerHTML = `<span style="color: #dc3545; font-weight: bold; margin-right: 10px;"><i class="fa-solid fa-thumbtack"></i> Đã ghim: </span> <span class="text-truncate" style="color: black; font-weight: 500;">${textGhim}</span>`;
    }

    validHistory.forEach(msg => renderMessage(msg));
}

function renderMessage(msg) {
    const existingRow = document.getElementById(`msg-${msg.id}`);
    const roomKey = getRoomKey(currentTarget);

    // NẾU TIN NHẮN ĐÃ TỒN TẠI TRÊN MÀN HÌNH -> CHỈ CẬP NHẬT CẢM XÚC/TRẠNG THÁI CHỨ KHÔNG XÓA (Chống giật)
    if (existingRow) {
        // Cập nhật chữ Đã xem
        const statusEl = existingRow.querySelector('.status-text');
        if (statusEl) statusEl.textContent = msg.sender === currentUsername ? (msg.status === 'seen' ? 'Đã xem' : 'Đã gửi') : '';
        
        // Cập nhật Cảm xúc
        const bubble = existingRow.querySelector('.msg-bubble');
        const oldReact = bubble.querySelector('.reaction-bar');
        if (oldReact) oldReact.remove(); // Gỡ tim cũ

        const reacts = Object.values(msg.reactions || {}).filter(r => r);
        if (reacts.length > 0) {
            const reactsHTML = `<div class="reaction-bar act-react" data-id="${msg.id}" style="position: absolute; bottom: -12px; right: 15px; background: white; border-radius: 12px; padding: 2px 8px; border: 1px solid #ddd; cursor: pointer; display: flex; gap: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 2;">${reacts.join('')}</div>`;
            bubble.insertAdjacentHTML('beforeend', reactsHTML);
            
            // Gắn lại sự kiện cho tim mới
            bubble.querySelector('.act-react').onclick = (e) => {
                e.stopPropagation();
                targetReactMsg = { roomKey: msg.roomKey, msgId: msg.id };
                els.reactPopup.style.display = 'flex';
                els.reactPopup.style.left = (e.clientX - 40) + 'px';
                els.reactPopup.style.top = (e.clientY - 50) + 'px';
            };
        }
        return; 
    }

    // NẾU LÀ TIN NHẮN MỚI -> TẠO BONG BÓNG MỚI
    const isMine = msg.sender === currentUsername;
    const div = document.createElement('div');
    div.className = `msg-row ${isMine ? 'mine' : 'theirs'}`;
    div.id = `msg-${msg.id}`;
    
    let senderHTML = (!isMine && localDB.rooms.includes(msg.roomKey)) ? `<div class="sender-name">${getDisplayName(msg.roomKey, msg.sender)}</div>` : '';
    let replyHTML = msg.replyTo ? `<div class="replied-to text-truncate">Trích dẫn: ${msg.replyTo}</div>` : '';
    
    let contentHTML = '';
    if (msg.type === 'text') contentHTML = msg.content;
    else if (msg.type === 'image') contentHTML = `<img src="${msg.content}" class="msg-img" onclick="window.open('${msg.content}')">`;
    else if (msg.type === 'audio') contentHTML = `<audio controls src="${msg.content}" style="height:35px;"></audio>`;
    else contentHTML = `<a href="${msg.content}" download="${msg.fileName}" class="msg-file">📄 ${msg.fileName}</a>`;

    const statusText = isMine ? (msg.status === 'seen' ? 'Đã xem' : 'Đã gửi') : '';
    
    let reactionHTML = '';
    const reacts = Object.values(msg.reactions || {}).filter(r => r);
    if (reacts.length > 0) reactionHTML = `<div class="reaction-bar act-react" style="position: absolute; bottom: -12px; right: 15px; background: white; border-radius: 12px; padding: 2px 8px; border: 1px solid #ddd; cursor: pointer; display: flex; gap: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 2;">${reacts.join('')}</div>`;

    const actionIcons = `
        <div class="action-icons">
            <span class="btn-react" title="Thả cảm xúc">❤️</span>
            <span class="btn-reply" title="Trả lời">↩️</span>
            <span class="btn-pin" title="Ghim/Bỏ ghim">📌</span>
        </div>
    `;

    div.innerHTML = `
        ${senderHTML}
        <div class="msg-bubble btn-reply-dbl">
            ${replyHTML}
            ${contentHTML}
            ${reactionHTML}
        </div>
        <div class="msg-meta">
            ${!isMine ? actionIcons : ''}
            <span>${msg.time}</span>
            <span class="status-text">${statusText}</span>
            ${isMine ? actionIcons : ''}
        </div>
    `;
    els.chatBox.appendChild(div);

    const replyText = msg.type === 'text' ? msg.content : '[Đính kèm]';

    // Đã thêm e.stopPropagation() để các nút không bị liệt
   div.querySelectorAll('.btn-react, .reaction-bar').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation(); // Phép thuật chống liệt nút (Cực kỳ quan trọng)
            
            targetReactMsg = { roomKey: msg.roomKey, msgId: msg.id };
            els.reactPopup.style.display = 'flex';
            els.reactPopup.style.position = 'fixed'; // Ép bảng nổi lên trên cùng màn hình
            els.reactPopup.style.zIndex = '99999';
            els.reactPopup.style.left = (e.clientX - 60) + 'px'; // Lấy đúng tọa độ chuột
            els.reactPopup.style.top = (e.clientY - 40) + 'px';
        };
    });

    div.querySelectorAll('.btn-reply, .btn-reply-dbl').forEach(el => {
        const handler = (e) => {
            e.stopPropagation();
            replyingTo = replyText;
            els.replyBar.style.display = 'flex';
            els.replyText.textContent = replyText;
            els.messageInput.focus();
        };
        if(el.classList.contains('btn-reply-dbl')) el.ondblclick = handler;
        else el.onclick = handler;
    });

    // 3. CHỨC NĂNG GHIM/BỎ GHIM
    div.querySelectorAll('.btn-pin').forEach(el => {
        el.onclick = (e) => { 
            e.stopPropagation(); // Phép thuật chống liệt nút
            socket.emit('pin_message', { roomKey: msg.roomKey, msgId: msg.id }); 
        };
    });

    els.chatBox.scrollTo({ top: els.chatBox.scrollHeight, behavior: 'smooth' });
}

// ----------------------------------------------------
// PHẦN CÒN LẠI HOẠT ĐỘNG HOÀN HẢO GIỮ NGUYÊN
// ----------------------------------------------------

function sendData(type, content, fileName = null) {
    if (!content) return;
    socket.emit('send_message', { receiver: currentTarget, type, content, fileName, replyTo: replyingTo });
    els.messageInput.value = '';
    cancelReply();
    els.messageInput.focus();
}

els.sendBtn.onclick = () => sendData('text', els.messageInput.value.trim());
els.messageInput.onkeypress = (e) => { if (e.key === 'Enter') els.sendBtn.click(); };
els.fileUpload.onchange = (e) => handleFileUpload(e.target.files[0]);
els.chatBox.ondragover = (e) => { e.preventDefault(); els.chatBox.classList.add('dragover'); };
els.chatBox.ondragleave = () => els.chatBox.classList.remove('dragover');
els.chatBox.ondrop = (e) => {
    e.preventDefault(); els.chatBox.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
};

function handleFileUpload(file) {
    if(!file) return;
    if(file.size > 10000000) return alert('File quá 10MB.');
    const reader = new FileReader();
    reader.onload = (evt) => {
        const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('audio/') ? 'audio' : 'file');
        sendData(type, evt.target.result, file.name);
    };
    reader.readAsDataURL(file);
}

let mediaRecorder; let audioChunks = []; let recordInterval;


// --- BẮT ĐẦU: CODE MỚI CHO MENU CÀI ĐẶT ÂM THANH ---
// =========================================================
// CÀI ĐẶT ÂM THANH (CÓ NÚT NGHE THỬ + FIX LỖI ÂM LƯỢNG)
// =========================================================
document.getElementById('open-settings').onclick = (e) => {
    e.preventDefault();
    openModal('Cài đặt Âm thanh', `
        <div class="setting-item" style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <label style="font-weight:bold;">Bật thông báo</label>
            <input type="checkbox" id="set-sound-toggle" ${sounds.toggle ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
        </div>
        <div class="setting-item" style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <label style="font-weight:bold;">Loại chuông</label>
            <select id="set-sound-type" style="padding:5px; border-radius:5px;">
                <option value="sound-ting" ${sounds.type==='sound-ting'?'selected':''}>Tiếng Chuông (Ting)</option>
                <option value="sound-bloop" ${sounds.type==='sound-bloop'?'selected':''}>Tiếng Nước (Bloop)</option>
            </select>
        </div>
        <div class="setting-item" style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <label style="font-weight:bold;">Âm lượng</label>
            <input type="range" id="set-sound-vol" min="0" max="1" step="0.1" value="${sounds.volume}" style="cursor:pointer;">
        </div>
        <button id="test-sound-btn" style="width:100%; padding:10px; background:var(--primary); border:none; border-radius:10px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            🔊 Nghe thử ngay
        </button>
    `);

    // Lưu cài đặt ngay khi bạn kéo/chọn
    document.getElementById('set-sound-toggle').onchange = (e) => sounds.toggle = e.target.checked;
    document.getElementById('set-sound-type').onchange = (e) => sounds.type = e.target.value;
    document.getElementById('set-sound-vol').onchange = (e) => sounds.volume = parseFloat(e.target.value); // Ép về dạng số chuẩn

    // Nút nghe thử (Giúp bạn biết chắc chắn loa đã kêu)
    document.getElementById('test-sound-btn').onclick = () => {
        if (!sounds.toggle) return alert("❌ Bạn đang TẮT thông báo nên không thể nghe thử!");
        
        const audio = document.getElementById(sounds.type);
        if (audio) {
            audio.volume = parseFloat(sounds.volume);
            audio.currentTime = 0; // Tua lại đầu bài để nghe liên tục
            audio.play().catch(err => alert("Trình duyệt đang chặn âm thanh!"));
        }
    };
};
// --- KẾT THÚC KHỐI CÀI ĐẶT ---

const closeRecordUI = () => {
    clearInterval(recordInterval);
    document.getElementById('recording-ui').style.display = 'none';
    els.messageInput.style.display = 'block';
    els.sendBtn.style.display = 'flex';
};

document.getElementById('stop-record').onclick = () => {
    if(mediaRecorder.state === "inactive") return;
    mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (evt) => sendData('audio', evt.target.result, 'VoiceRecord.webm');
        reader.readAsDataURL(blob);
    };
    mediaRecorder.stop(); closeRecordUI();
};
document.getElementById('cancel-record').onclick = () => { mediaRecorder.stop(); closeRecordUI(); };

socket.on('receive_message', (msg) => {
    if (!localHistories[msg.roomKey]) localHistories[msg.roomKey] = [];
    if (!localHistories[msg.roomKey].find(m => m.id === msg.id)) localHistories[msg.roomKey].push(msg);

    if (getRoomKey(currentTarget) === msg.roomKey) {
        renderMessage(msg);
        if(msg.sender !== currentUsername) socket.emit('mark_read', { roomKey: msg.roomKey, reader: currentUsername });
    } else {
        const source = localDB.rooms.includes(msg.roomKey) ? msg.roomKey : msg.sender;
        unreadCounts[source] = (unreadCounts[source] || 0) + 1;
        renderSidebar();
        if (sounds.toggle && msg.sender !== currentUsername) {
            const audio = document.getElementById(sounds.type);
            audio.volume = sounds.volume;
            audio.play().catch(e => {});
        }
    }
    if (!localHistories[msg.roomKey].find(m => m.id === msg.id)) localHistories[msg.roomKey].push(msg);

        // ĐOẠN NÀY LÀ ĐỂ PHÁT NHẠC KHI CÓ TIN NHẮN TỚI
        if (sounds.toggle && msg.sender !== currentUsername) {
            const audio = document.getElementById(sounds.type);
            if (audio) {
                audio.volume = parseFloat(sounds.volume);
                audio.currentTime = 0;
                audio.play().catch(e => console.log('Chặn âm thanh'));
            }
        }
    
});

socket.on('messages_read', ({ roomKey, reader }) => { 
    if (localHistories[roomKey]) localHistories[roomKey].forEach(m => { if(m.sender !== reader) m.status = 'seen'; });
    if (getRoomKey(currentTarget) === roomKey) loadChatBox(); 
});

socket.on('update_message_meta', ({ roomKey }) => { 
    if (getRoomKey(currentTarget) === roomKey) loadChatBox(); 
});

els.messageInput.addEventListener('input', () => {
    socket.emit('typing', { receiver: currentTarget, isTyping: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('typing', { receiver: currentTarget, isTyping: false }), 2000);
});

socket.on('user_typing', ({ sender, receiver, isTyping, isGroup }) => {
    if (receiver === currentTarget || (receiver === currentUsername && sender === currentTarget)) {
        if(isTyping) {
            const name = isGroup ? getDisplayName(getRoomKey(currentTarget), sender) : 'Đối phương';
            els.typingIndicator.textContent = `${name} đang soạn tin...`;
            els.typingIndicator.style.display = 'inline';
        } else els.typingIndicator.style.display = 'none';
    }
});

const cancelReply = () => { replyingTo = null; els.replyBar.style.display = 'none'; };
document.getElementById('cancel-reply').onclick = cancelReply;

document.querySelectorAll('.react-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        if(targetReactMsg) socket.emit('react_message', { roomKey: targetReactMsg.roomKey, msgId: targetReactMsg.msgId, emoji: e.target.textContent });
        els.reactPopup.style.display = 'none';
    };
});


window.addEventListener('click', (e) => { 
    if(!e.target.closest('.action-icons') && !e.target.closest('.reaction-bar') && !e.target.closest('#reaction-popup')) {
        els.reactPopup.style.display = 'none'; 
    }
});

els.emojiToggle.onclick = () => { els.emojiPicker.style.display = els.emojiPicker.style.display === 'none' ? 'flex' : 'none'; };
document.querySelectorAll('.emoji-item').forEach(el => el.onclick = () => { els.messageInput.value += el.textContent; els.messageInput.focus(); });

const openModal = (title, html) => { els.modalTitle.textContent = title; els.modalBody.innerHTML = html; els.modal.style.display = 'flex'; };
document.getElementById('close-modal').onclick = () => els.modal.style.display = 'none';
document.getElementById('toggle-theme').onclick = (e) => { e.preventDefault(); document.body.classList.toggle('dark-mode'); };

document.getElementById('open-settings').onclick = (e) => {
    e.preventDefault();
    openModal('Cài đặt Âm thanh', `
        <div class="setting-item"><label>Bật thông báo</label><input type="checkbox" id="set-sound-toggle" ${sounds.toggle ? 'checked' : ''}></div>
        <div class="setting-item"><label>Loại chuông</label><select id="set-sound-type"><option value="sound-ting" ${sounds.type==='sound-ting'?'selected':''}>Ting Ting</option><option value="sound-bloop" ${sounds.type==='sound-bloop'?'selected':''}>Bloop</option></select></div>
        <div class="setting-item"><label>Âm lượng</label><input type="range" id="set-sound-vol" min="0" max="1" step="0.1" value="${sounds.volume}"></div>
    `);
    document.getElementById('set-sound-toggle').onchange = (e) => sounds.toggle = e.target.checked;
    document.getElementById('set-sound-type').onchange = (e) => sounds.type = e.target.value;
    document.getElementById('set-sound-vol').onchange = (e) => sounds.volume = e.target.value;
};

document.getElementById('create-room-btn').onclick = (e) => {
    e.preventDefault(); 
    const room = prompt("Nhập tên nhóm chat mới:");
    if (room) {
        socket.emit('create_room', room);
        alert('✅ Đã tạo nhóm thành công!');
    }
};

document.getElementById('menu-add-member').onclick = (e) => {
    e.preventDefault();
    if (!localDB.rooms.includes(currentTarget)) return alert('❌ Chỉ áp dụng cho Nhóm chat!');
    const user = prompt("Nhập TÊN ĐĂNG NHẬP của người bạn muốn mời vào nhóm:");
    if (user) {
        if (!localDB.users[user]) return alert('❌ Tên đăng nhập này không tồn tại!');
        socket.emit('add_member', { room: currentTarget, targetUser: user });
        alert(`✅ Đã thêm ${user} vào nhóm!`);
    }
};

document.getElementById('menu-rename-room').onclick = (e) => {
    e.preventDefault();
    if (!localDB.rooms.includes(currentTarget)) return alert('❌ Chỉ áp dụng cho Nhóm chat!');
    const newName = prompt("Nhập tên hiển thị mới của nhóm:", getRoomName(currentTarget));
    if (newName) { 
        socket.emit('rename_room', { roomKey: currentTarget, newName });
        alert('✅ Đổi tên nhóm thành công!');
    }
};

document.getElementById('menu-nickname').onclick = (e) => {
    e.preventDefault();
    let targetUser = currentTarget;
    if (localDB.rooms.includes(currentTarget)) {
        targetUser = prompt("Nhập CHÍNH XÁC 'Tên đăng nhập' của thành viên muốn đổi biệt danh:");
        if (!targetUser) return;
        if (!localDB.users[targetUser] && targetUser !== currentUsername) return alert('❌ Tên đăng nhập không tồn tại trong hệ thống!');
    }
    let currentNick = getDisplayName(getRoomKey(currentTarget), targetUser);
    if (currentNick === targetUser) currentNick = "";
    let nick = prompt(`Nhập biệt danh mới cho ${targetUser} (Để trống nếu muốn xóa):`, currentNick);
    if (nick !== null) { 
        socket.emit('set_nickname', { roomKey: getRoomKey(currentTarget), targetUser, nickname: nick });
        alert('✅ Cập nhật biệt danh thành công!');
    }
};

document.getElementById('menu-gallery').onclick = (e) => {
    e.preventDefault();
    const history = localHistories[getRoomKey(currentTarget)] || [];
    const userDeletedTime = localDB.users[currentUsername]?.deletedRooms?.[getRoomKey(currentTarget)] || 0;
    
    let html = '<div class="gallery-grid">';
    let hasMedia = false;
    history.forEach(msg => {
        if(msg.timestamp > userDeletedTime) {
            if (msg.type === 'image') { html += `<img src="${msg.content}" onclick="window.open('${msg.content}')">`; hasMedia = true; }
            else if (msg.type === 'file') { html += `<a href="${msg.content}" download="${msg.fileName}">📄 ${msg.fileName}</a>`; hasMedia = true; }
        }
    });
    openModal('Kho Media & File', hasMedia ? html + '</div>' : '<p style="text-align:center;color:gray;">Chưa có ảnh/file nào</p>');
};

document.getElementById('menu-delete-chat').onclick = (e) => {
    e.preventDefault();
    if(confirm('🗑️ Xóa sạch lịch sử đoạn chat này (Chỉ xóa phía của bạn, người kia không bị mất)?')) {
        socket.emit('delete_conversation', getRoomKey(currentTarget));
        alert('✅ Đã dọn dẹp lịch sử trò chuyện!');
    }
};
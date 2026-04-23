exports.heavySync = (req, res) => {
    console.log(">>> Bắt đầu Sync request...");
    const start = Date.now();
    while (Date.now() - start < 3000) { /* Chặn Event Loop trong 3 giây */ }
    console.log("<<< Kết thúc Sync request.");
    res.json({ message: "Xử lý đồng bộ xong!" });
};

exports.heavyAsync = (req, res) => {
    console.log(">>> Bắt đầu Async request...");
    setTimeout(() => {
        console.log("<<< Kết thúc Async request.");
        res.json({ message: "Xử lý bất đồng bộ xong!" });
    }, 3000);
};
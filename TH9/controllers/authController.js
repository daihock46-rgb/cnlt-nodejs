exports.login = (req, res) => {
    const { username, password } = req.body;
    // Tài khoản mặc định theo yêu cầu
    if (username === 'admin' && password === '123456') {
        req.session.user = { username: 'admin' };
        return res.json({ message: "Đăng nhập thành công!" });
    }
    res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.json({ message: "Đã đăng xuất thành công!" });
};
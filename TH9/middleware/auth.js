const requireLogin = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ message: "Bạn cần đăng nhập để thực hiện thao tác này!" });
};
module.exports = { requireLogin };
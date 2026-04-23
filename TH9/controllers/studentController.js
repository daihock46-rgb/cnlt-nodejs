// Dữ liệu mẫu ban đầu
let students = [
    { id: 1, name: "Nguyen Van A", email: "a@gmail.com", age: 20, class: "CNTT1", isDeleted: false },
    { id: 2, name: "Tran Thi B", email: "b@gmail.com", age: 22, class: "CNTT2", isDeleted: false },
    { id: 3, name: "Le Van C", email: "c@gmail.com", age: 19, class: "CNTT1", isDeleted: false }
];

// 1. Lấy danh sách, Tìm kiếm, Sắp xếp, Phân trang
exports.getAllStudents = (req, res) => {
    let { name, class: className, sort, page = 1, limit = 2 } = req.query;
    
    // Lọc bỏ các sinh viên đã bị xóa (Soft Delete)
    let result = students.filter(s => !s.isDeleted);

    // Tìm kiếm & Lọc
    if (name) result = result.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
    if (className) result = result.filter(s => s.class === className);

    // Sắp xếp theo tuổi
    if (sort === 'age_desc') result.sort((a, b) => b.age - a.age);
    if (sort === 'age_asc') result.sort((a, b) => a.age - b.age);

    // Phân trang
    const total = result.length;
    const startIndex = (page - 1) * limit;
    const data = result.slice(startIndex, startIndex + parseInt(limit));

    res.json({ page: parseInt(page), limit: parseInt(limit), total, data });
};

// 2. Thêm sinh viên + Validation
exports.createStudent = (req, res) => {
    const { name, email, age, class: className } = req.body;

    // Validation
    if (!name || name.length < 2) return res.status(400).json({ msg: "Tên phải >= 2 ký tự" });
    const emailExists = students.find(s => s.email === email);
    if (emailExists) return res.status(400).json({ msg: "Email đã tồn tại" });
    if (age < 16 || age > 60) return res.status(400).json({ msg: "Tuổi phải từ 16 đến 60" });

    const newStudent = { id: Date.now(), name, email, age, class: className, isDeleted: false };
    students.push(newStudent);
    res.status(201).json(newStudent);
};

// 3. Xóa tạm thời (Soft Delete)
exports.deleteStudent = (req, res) => {
    const student = students.find(s => s.id == req.params.id);
    if (student) {
        student.isDeleted = true;
        return res.json({ message: "Đã xóa tạm thời sinh viên (Soft Delete)" });
    }
    res.status(404).json({ message: "Không tìm thấy sinh viên" });
};

// 4. Thống kê tổng quan
exports.getStats = (req, res) => {
    const total = students.length;
    const activeList = students.filter(s => !s.isDeleted);
    const deleted = students.filter(s => s.isDeleted).length;
    const averageAge = activeList.length > 0 
        ? activeList.reduce((sum, s) => sum + s.age, 0) / activeList.length 
        : 0;

    res.json({ total, active: activeList.length, deleted, averageAge });
};

// 5. Thống kê theo lớp
exports.getStatsByClass = (req, res) => {
    const stats = {};
    students.filter(s => !s.isDeleted).forEach(s => {
        stats[s.class] = (stats[s.class] || 0) + 1;
    });
    const result = Object.keys(stats).map(c => ({ class: c, count: stats[c] }));
    res.json(result);
};
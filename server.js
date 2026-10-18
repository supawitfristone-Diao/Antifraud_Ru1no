const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const SECRET_KEY = 'my_secret_key';

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        req.user = user;
        next();
    });
}
function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)' });
    }
}
app.post('/api/register', (req, res) => {
    const { name, phone, password } = req.body;
    db.run(
        `INSERT INTO Users (name, phone, password) VALUES (?, ?, ?)`,
        [name, phone, password],
        function (err) {
            if (err) {
                console.error('Register Error:', err.message);
                return res.status(400).json({ error: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });
            }
            res.json({ message: 'สมัครสมาชิกสำเร็จ' });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    db.get(
        `SELECT * FROM Users WHERE phone = ? AND password = ?`,
        [phone, password],
        (err, user) => {
            if (err || !user) {
                return res.status(400).json({ error: 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง' });
            }
            const token = jwt.sign(
                { id: user.id, phone: user.phone, role: user.role, name: user.name },
                SECRET_KEY,
                { expiresIn: '1d' }
            );
            res.json({ token, role: user.role, name: user.name });
        }
    );
});

app.post('/api/reports', authenticateToken, upload.single('evidence'), (req, res) => {
    const { suspect_name, suspect_phone, bank_account, damage_amount, details } = req.body;
    const evidence_path = req.file ? req.file.filename : null;
    const user_id = req.user.id;

    const sql = `
        INSERT INTO Reports (user_id, suspect_name, suspect_phone, bank_account, damage_amount, details, evidence_path, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    const params = [user_id, suspect_name, suspect_phone, bank_account, damage_amount, details, evidence_path];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Database Insert Error:', err.message);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message });
        }
        res.json({ message: 'แจ้งเบาะแสเรียบร้อยแล้ว (รอการตรวจสอบจากผู้ดูแลระบบ)' });
    });
});

app.get('/api/reports/search', (req, res) => {
    const q = req.query.q || '';
    const sql = `
        SELECT * FROM Reports 
        WHERE (status = 'approved' OR status IS NULL OR status = 'pending') 
        AND (suspect_name LIKE ? OR suspect_phone LIKE ? OR bank_account LIKE ?)
        ORDER BY id DESC
    `;
    const param = `%${q}%`;
    db.all(sql, [param, param, param], (err, rows) => {
        if (err) {
            console.error('Search Error:', err.message);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหา' });
        }
        res.json(rows);
    });
});

app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    db.all(`SELECT id, name, phone, role FROM Users ORDER BY id ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'ดึงข้อมูลผู้ใช้ล้มเหลว' });
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/role', authenticateToken, isAdmin, (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;
    db.run(`UPDATE Users SET role = ? WHERE id = ?`, [role, userId], function (err) {
        if (err) return res.status(500).json({ error: 'อัปเดตสิทธิ์ล้มเหลว' });
        res.json({ message: 'อัปเดตสิทธิ์เรียบร้อยแล้ว' });
    });
});
app.get('/api/admin/reports', authenticateToken, isAdmin, (req, res) => {
    const sql = `
        SELECT Reports.*, Users.name as reporter_name 
        FROM Reports 
        LEFT JOIN Users ON Reports.user_id = Users.id 
        ORDER BY Reports.id DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'ดึงข้อมูลรายงานล้มเหลว' });
        res.json(rows);
    });
});
app.put('/api/admin/reports/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    const reportId = req.params.id;
    db.run(`UPDATE Reports SET status = ? WHERE id = ?`, [status, reportId], function (err) {
        if (err) return res.status(500).json({ error: 'อัปเดตสถานะล้มเหลว' });
        res.json({ message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
    });
});
app.delete('/api/admin/reports/:id', authenticateToken, isAdmin, (req, res) => {
    const reportId = req.params.id;
    db.run(`DELETE FROM Reports WHERE id = ?`, [reportId], function (err) {
        if (err) return res.status(500).json({ error: 'ลบรายงานล้มเหลว' });
        res.json({ message: 'ลบรายงานเรียบร้อยแล้ว' });
    });
});
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

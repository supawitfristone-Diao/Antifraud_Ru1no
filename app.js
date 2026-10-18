document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            register();
        });
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitReport();
        });
    }
});
function updateNavbar() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');

    if (token) {
        let adminMenu = '';
        if (role === 'admin') {
            adminMenu = `<li class="nav-item"><a class="nav-link" href="admin.html">จัดการระบบ (Admin)</a></li>`;
        }

        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="index.html">ค้นหา</a></li>
            <li class="nav-item"><a class="nav-link" href="report.html">แจ้งเบาะแส</a></li>
            ${adminMenu}
            <li class="nav-item"><span class="nav-link text-warning fw-bold">สวัสดี, ${name || 'ผู้ใช้งาน'}</span></li>
            <li class="nav-item"><a class="nav-link text-danger fw-bold" href="#" onclick="logout()">ออกจากระบบ</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="index.html">ค้นหา</a></li>
            <li class="nav-item"><a class="nav-link" href="login.html">เข้าสู่ระบบ</a></li>
            <li class="nav-item"><a class="nav-link btn btn-outline-warning btn-sm text-white ms-2" href="register.html">สมัครสมาชิก</a></li>
        `;
    }
}

function logout() {
    localStorage.clear();
    alert('ออกจากระบบเรียบร้อยแล้ว');
    window.location.href = 'login.html';
}
async function register() {
    const nameInput = document.getElementById('reg_name') || document.getElementById('name');
    const phoneInput = document.getElementById('reg_phone') || document.getElementById('phone');
    const passwordInput = document.getElementById('reg_password') || document.getElementById('password');
    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!name || !phone || !password) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password })
        });
        const data = await res.json();

        if (res.ok) {
            alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            window.location.href = 'login.html';
        } else {
            alert(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
}

async function login() {
    const phoneInput = document.getElementById('login_phone') || document.getElementById('phone');
    const passwordInput = document.getElementById('login_password') || document.getElementById('password');
    const alertBox = document.getElementById('authAlert') || document.getElementById('loginAlert');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!phone || !password) {
        alert('กรุณากรอกเบอร์โทรศัพท์และรหัสผ่าน');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('name', data.name);
            alert('เข้าสู่ระบบสำเร็จ');
            window.location.href = 'index.html';
        } else {
            if (alertBox) {
                alertBox.className = 'alert alert-danger';
                alertBox.innerText = data.error || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง';
                alertBox.classList.remove('d-none');
            } else {
                alert(data.error || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง');
            }
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
}
async function submitReport() {
    const alertBox = document.getElementById('reportAlert');
    if (alertBox) alertBox.classList.add('d-none');

    const token = localStorage.getItem('token');
    if (!token) {
        if (alertBox) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerText = 'กรุณาเข้าสู่ระบบก่อนแจ้งเบาะแส';
            alertBox.classList.remove('d-none');
        } else {
            alert('กรุณาเข้าสู่ระบบก่อนแจ้งเบาะแส');
        }
        return;
    }

    const formData = new FormData();
    formData.append('suspect_name', document.getElementById('suspect_name').value);
    formData.append('suspect_phone', document.getElementById('suspect_phone').value);
    formData.append('bank_account', document.getElementById('bank_account').value);
    formData.append('damage_amount', document.getElementById('damage_amount').value);
    formData.append('details', document.getElementById('details').value);

    const fileInput = document.getElementById('evidence_file');
    if (fileInput && fileInput.files[0]) {
        formData.append('evidence', fileInput.files[0]);
    }

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            if (alertBox) {
                alertBox.className = 'alert alert-success';
                alertBox.innerText = data.message || 'บันทึกข้อมูลแจ้งเบาะแสสำเร็จ';
                alertBox.classList.remove('d-none');
            } else {
                alert(data.message || 'บันทึกข้อมูลแจ้งเบาะแสสำเร็จ');
            }
            document.getElementById('reportForm').reset();
        } else {
            if (alertBox) {
                alertBox.className = 'alert alert-danger';
                alertBox.innerText = data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
                alertBox.classList.remove('d-none');
            } else {
                alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
}
async function searchReports() {
    const query = document.getElementById('searchInput')?.value || '';
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    try {
        const res = await fetch(`/api/reports/search?q=${encodeURIComponent(query)}`);
        const reports = await res.json();

        if (reports.length === 0) {
            resultsContainer.innerHTML = `<div class="alert alert-info text-center">ไม่พบข้อมูลรายชื่อหรือเลขบัญชีที่ค้นหา</div>`;
            return;
        }

        resultsContainer.innerHTML = reports.map(r => `
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-danger fw-bold">${r.suspect_name}</h5>
                    <p class="card-text mb-1"><strong>เบอร์โทรศัพท์:</strong> ${r.suspect_phone || '-'}</p>
                    <p class="card-text mb-1"><strong>เลขบัญชี:</strong> ${r.bank_account || '-'}</p>
                    <p class="card-text mb-1"><strong>ยอดความเสียหาย:</strong> ${r.damage_amount ? r.damage_amount.toLocaleString() : 0} บาท</p>
                    <p class="card-text mb-2"><strong>รายละเอียด:</strong> ${r.details || '-'}</p>
                    ${r.evidence_path ? `<a href="/uploads/${r.evidence_path}" target="_blank" class="btn btn-sm btn-outline-primary">ดูหลักฐานประกอบ</a>` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = `<div class="alert alert-danger text-center">เกิดข้อผิดพลาดในการค้นหา</div>`;
    }
}

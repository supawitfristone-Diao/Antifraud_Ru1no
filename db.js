const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS Reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            suspect_name TEXT NOT NULL,
            suspect_phone TEXT,
            bank_account TEXT,
            damage_amount REAL,
            details TEXT,
            evidence_path TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    `);
    db.run(`ALTER TABLE Reports ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => {
    });
});

module.exports = db;

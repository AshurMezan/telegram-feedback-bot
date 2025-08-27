const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных. __dirname — это текущая папка
const dbPath = path.resolve(__dirname, 'blacklist.sqlite');

// Создаем подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message);
    } else {
        console.log('Подключение к базе данных SQLite успешно установлено.');
        
        // Создаем таблицу, если её ещё нет
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY UNIQUE
            )
        `, (err) => {
            if (err) {
                console.error('Ошибка при создании таблицы:', err.message);
            } else {
                console.log('Таблица "users" готова.');
            }
        });
    }
});

module.exports = db;
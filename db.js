const sqlite3 = require('sqlite3').verbose(); // Импортируем модуль sqlite3, который позволяет взаимодействовать с базами данных SQLite. А .verbose() делает вывод ошибок более подробным -- полезно для отладки.
const path = require('path'); // Импортируем встроенный в Node.js модуль path. Он нужен для работы с путями к файлам и папкам в независимости от ОС.

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
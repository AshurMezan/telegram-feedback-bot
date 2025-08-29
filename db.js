const sqlite3 = require('sqlite3').verbose(); // Импортируем модуль sqlite3, который позволяет взаимодействовать с базами данных SQLite. А .verbose() делает вывод ошибок более подробным -- полезно для отладки.
const path = require('path'); // Импортируем встроенный в Node.js модуль path. Он нужен для работы с путями к файлам и папкам в независимости от ОС.
const logger = require('./logger');

// Путь к файлу базы данных. __dirname — это текущая папка
const dbPath = path.resolve(__dirname, 'blacklist.sqlite');

// Создаем подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error({ err }, 'Ошибка при подключении к базе данных');
    } else {
        logger.info('Подключение к базе данных SQLite успешно установлено.');
        
        // Создаем таблицу, если её ещё нет
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY UNIQUE
            )
        `, (err) => {
            if (err) {
                logger.error({ err }, 'Ошибка при создании таблицы');
            } else {
                logger.info('Таблица "users" готова.');
            }
        });
    }
});

module.exports = db;
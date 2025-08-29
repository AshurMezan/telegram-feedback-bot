const fs = require('fs');
const path = require('path');
const pino = require('pino');

// Убеждаемся, что каталог для логов существует
const logDir = path.resolve(__dirname, 'log');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'logs.log');

// Создаем логгер pino, который пишет JSON в файл; в dev выводим читабельно в консоль
const transport = process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
    }
} : undefined;

// Форматируем дату как dd.mm.yyyy HH:MM
function formatTimestamp(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const HH = String(date.getHours()).padStart(2, '0');
    const MM = String(date.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${HH}:${MM}`;
}

const logger = pino(
    {
        level: process.env.LOG_LEVEL || 'info',
        base: undefined,
        timestamp: () => `,"time":"${formatTimestamp(new Date())}"`
    },
    pino.destination({ dest: logFilePath, sync: false })
);

// Необязательный красивый вывод в консоль для локальной отладки
if (transport) {
    const pretty = pino(transport);
    // Пробрасываем сообщения в консольный логгер для красивого вывода
    // const childForConsole = logger.child({});
    const consoleLogger = {
        trace: (...args) => pretty.trace(...args),
        debug: (...args) => pretty.debug(...args),
        info: (...args) => pretty.info(...args),
        warn: (...args) => pretty.warn(...args),
        error: (...args) => pretty.error(...args),
        fatal: (...args) => pretty.fatal(...args)
    };
    logger.console = consoleLogger;
}

module.exports = logger;



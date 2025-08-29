require('dotenv').config(); // импортируем переменные окружения
const logger = require('./logger');
const { Bot } = require('grammy'); // импортируем бота
const menu = require('./menu.js'); // Импортируем кнопку "Меню"
const { 
    startHandler, 
    aboutHandler, 
    helpHandler, 
    getIdChatHandler,
    blockHandler,
    unblockHandler,
} = require('./commands.js'); // Импортируем обработчики команд
const {
    textMessageHandler,
    photoMessageHandler,
    documentMessageHandler,
    otherMessageHandler,
} = require('./handlers.js'); // Импортируем обработчики сообщений

const bot = new Bot(process.env.BOT_API_KEY);
const CHAT_ID = process.env.CHAT_ID;

// Блок с командами для меню
async function setupMenu() {
    await bot.api.setMyCommands(menu);
}
setupMenu();

// Команды админ-чата
bot.command('block', blockHandler);
bot.command('unblock', unblockHandler);
bot.command('help', helpHandler);
bot.command('get_id_chat', getIdChatHandler);
// Команды для клиента
bot.command('start', startHandler);
bot.command('about', aboutHandler);

// Обработчики сообщений
bot.on('message:text', (ctx) => textMessageHandler(ctx, CHAT_ID, bot));
bot.on('message:photo', (ctx) => photoMessageHandler(ctx, CHAT_ID, bot));
bot.on('message:document', (ctx) => documentMessageHandler(ctx, CHAT_ID, bot));
bot.on('message', (ctx) => otherMessageHandler(ctx, bot));

// Запускаем бот
async function runBot() {
    try {
        // Глобальный обработчик ошибок бота
        bot.catch((err) => {
            const ctx = err.ctx;
            logger.error({ update: ctx?.update, err }, 'Ошибка бота перехвачена');
        });

        bot.start();
        logger.info('Бот запущен.');
    } catch (error) {
        logger.fatal({ error }, 'Критическая ошибка. Бот не запустился');
    };
}

runBot()

// Обработчики на уровне процесса
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Необработанное отклонение промиса');
});
process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Необработанное исключение');
    process.exit(1);
});
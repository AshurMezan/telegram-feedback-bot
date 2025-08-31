require('dotenv').config(); // импортируем переменные окружения
const logger = require('./logger');
const db = require('./db.js');
const { Bot } = require('grammy'); // импортируем бота
const menu = require('./menu.js'); // Импортируем кнопку "Меню"
const { 
    startHandler, 
    aboutHandler, 
    helpHandler, 
    getIdChatHandler,
    blockHandler,
    unblockHandler,
    giveMeAllUsersHandler,
    listUsersHandler,
    recentUsersHandler,
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
bot.command('give_me_all_users', giveMeAllUsersHandler);
bot.command('list_users', listUsersHandler);
bot.command('recent_users', recentUsersHandler);

// Команды для клиента
bot.command('start', startHandler);
bot.command('about', aboutHandler);

// Обработчик для рассылки
bot.on("message").filter(async (ctx) => {
    // 1. Проверяем, что сообщение пришло из нужного чата
    if (String(ctx.chat.id) === String(CHAT_ID)) {
        // 2. Получаем текст сообщения
        const messageText = ctx.message.text || ctx.message.caption;

        // 3. Проверяем, существует ли текст и содержит ли он '/send_news'
        if (messageText && messageText.includes('/send_news')) {
            // 4. Получаем текст сообщения для рассылки
            const textToSend = ctx.message.text;

            // 5. Получаем список всех подписчиков из таблицы bot_users
            try {
                const subscribers = await new Promise((resolve, reject) => {
                    db.all('SELECT user_id FROM bot_users', (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            // Возвращаем массив ID пользователей
                            resolve(rows.map(row => row.user_id));
                        }
                    });
                });

                // 6. Запускаем рассылку
                for (const userId of subscribers) {
                    try {
                        await bot.api.sendMessage(userId, textToSend);
                        // Делаем небольшую задержку, чтобы избежать лимитов Telegram
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (err) {
                        // Обработка ошибок, если пользователь заблокировал бота
                        if (err instanceof GrammyError || err instanceof HttpError) {
                            console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, err.message);
                        }
                    }
                }

                // 7. Отправляем подтверждение об окончании рассылки
                await ctx.reply(`Рассылка успешно завершена. Сообщение отправлено ${subscribers.length} пользователям.`);

            } catch (err) {
                // Обработка ошибок при работе с базой данных
                console.error("Ошибка при получении списка пользователей:", err);
                await ctx.reply("Произошла ошибка при получении списка подписчиков.");
            }
        }
    }
});

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
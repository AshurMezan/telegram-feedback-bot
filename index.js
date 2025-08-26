require('dotenv').config(); // импортируем переменные окружения
const { Bot } = require('grammy'); // импртируем бота
const menu = require('./menu.js'); // Импортируем кнопку "Меню"
const { 
    startHandler, 
    aboutHandler, 
    helpHandler, 
    getIdChatHandler 
} = require('./commands.js'); // Импортируем обработчики команд
const bot = new Bot(process.env.BOT_API_KEY);
const CHAT_ID = process.env.CHAT_ID;

{  // Блок с командами для меню
    async function setupMenu() {
        await bot.api.setMyCommands(menu);
    }

    setupMenu() ;
}

{ // Блок с командами
    bot.command('start', startHandler);
    bot.command('about', aboutHandler);
    bot.command('help', helpHandler);
    bot.command('get_id_chat', getIdChatHandler);
}

// Новая логика для обработки сообщений
bot.on('message', async (ctx) => {
    // Если сообщение является командой, игнорируем
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
        return;
    }

    // Проверяем, какой тип контента в сообщении
    const isText = ctx.message.text;
    const isPhoto = ctx.message.photo;
    const isPdf = ctx.message.document && ctx.message.document.mime_type === 'application/pdf';

    if (isText || isPhoto || isPdf) {
        // Если тип данных разрешён, обрабатываем сообщение
        if (CHAT_ID) {
            const from = ctx.from;
            const userId = from.id;
            const userName = from.username ? `(@${from.username})` : '';
            const userFullName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');
            
            const header = `Сообщение от ${userFullName} ${userName} - ${userId}:`;
            
            // Определяем, что переслать
            if (isText) {
                const fullMessage = `${header}\n\n${ctx.message.text}`;
                await bot.api.sendMessage(Number(CHAT_ID), fullMessage);
            } else if (isPhoto) {
                // Пересылаем фото и подписываем его
                await bot.api.sendPhoto(
                    Number(CHAT_ID),
                    ctx.message.photo[ctx.message.photo.length - 1].file_id,
                    { caption: header }
                );
            } else if (isPdf) {
                // Пересылаем документ и подписываем его
                await bot.api.sendDocument(
                    Number(CHAT_ID),
                    ctx.message.document.file_id,
                    { caption: header }
                );
            }
        }
    } else {
        // Если тип данных не разрешён, отвечаем пользователю
        await ctx.reply('С таким типом данных не работаю.');
    }
});


bot.start();
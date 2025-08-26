require('dotenv').config(); // импортируем переменные окружения
const { Bot } = require('grammy'); // импортируем бота
const menu = require('./menu.js'); // Импортируем кнопку "Меню"
const { 
    startHandler, 
    aboutHandler, 
    helpHandler, 
    getIdChatHandler 
} = require('./commands.js'); // Импортируем обработчики команд

const bot = new Bot(process.env.BOT_API_KEY);
const CHAT_ID = process.env.CHAT_ID;

// Блок с командами для меню
async function setupMenu() {
    await bot.api.setMyCommands(menu);
}
setupMenu();

// Блок с командами
bot.command('start', startHandler);
bot.command('about', aboutHandler);
bot.command('help', helpHandler);
bot.command('get_id_chat', getIdChatHandler);

// Главный обработчик для всех текстовых сообщений
bot.on('message:text', async (ctx) => {
    // Игнорируем команды, которые начинаются с '/'
    if (ctx.message.text.startsWith('/')) {
        return;
    }
    
    // Проверяем, если сообщение пришло из личного чата
    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        const userName = from.username ? `(@${from.username})` : '';
        const userFullName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');
        
        // Создаём заголовок с информацией о пользователе и специальным тегом
        const header = `Сообщение от ${userFullName} ${userName} - ${userId}:\n#user${userId}`;
        const fullMessage = `${header}\n\n${ctx.message.text}`;
        
        await bot.api.sendMessage(Number(CHAT_ID), fullMessage);

    } else if (String(ctx.chat.id) === CHAT_ID) { // Иначе, если сообщение пришло из админского чата
        // Проверяем, является ли это ответом на другое сообщение
        if (ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            
            // Получаем текст сообщения, на которое ответили
            const repliedText = repliedMessage.text;

            // Используем регулярное выражение для поиска ID пользователя в тексте
            const match = repliedText.match(/#user(\d+)/);
            
            if (match && match[1]) {
                const privateChatId = match[1];
                
                // Отправляем ответ пользователю
                await bot.api.sendMessage(privateChatId, ctx.message.text);
                await ctx.reply('Отправляю обратно.');
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
            }
        }
    }
});

bot.start();
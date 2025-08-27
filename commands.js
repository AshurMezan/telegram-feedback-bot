// Импортируем CHAT_ID, чтобы использовать его в обработчиках
const CHAT_ID = process.env.CHAT_ID;

const startHandler = async (ctx) => {
    await ctx.reply('Добро пожаловать. Вы активировали бота.');
};

const aboutHandler = async (ctx) => {
    await ctx.reply('Это бот обратной связи для пользователей. Он позволяет отправлять сообщения в чат администратора. Бот обрабатывает текстовые сообщения, фото и PDF файлы.');
};

const helpHandler = async (ctx) => {
    if (String(ctx.chat.id) !== CHAT_ID) {
        await ctx.reply('Я работаю только в определенном чате. Обратитесь к администратору, чтобы получить помощь.');
        return;
    }

    const helpMessage = `Команды бота:
/block {user_id} - Блокировка пользователя по его телеграм ID. Пример: /block 950580180
/unblock {user_id} - Разблокировка пользователя по его телеграм ID. Пример: /unblock 950580180
/get_id_chat - Узнать ID чата.`;

    await ctx.reply(helpMessage);
};

const getIdChatHandler = async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply(`ID этого чата: ${chatId}`);
};

// Экспортируем все функции, чтобы они были доступны в других файлах
module.exports = {
    startHandler,
    aboutHandler,
    helpHandler,
    getIdChatHandler,
};
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
/block {user_id} - Блокировка пользователя по его телеграм ID.
/unblock {user_id} - Разблокировка пользователя по его телеграм ID.
/block_list {page_number} - Увидеть список заблокированных пользователей на странице N. По умолчанию N=1
/user_list {page_number} - Увидеть список всех пользователей на странице N. По умолчанию N=1.
/get_id_chat - Узнать ID чата.
/get_messages_list - Посмотреть список сообщений для пользователей.
/change_message {msg_key} {msg_text} - Изменить текст сообщения для пользователя. msgkey - ключ сообщения, msgtext - новый текст сообщения.`;

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
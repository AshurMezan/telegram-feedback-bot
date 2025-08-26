require('dotenv').config();
const { Bot } = require('grammy');

const bot = new Bot(process.env.BOT_API_KEY);
const CHAT_ID = process.env.CHAT_ID;

bot.api.setMyCommands([
    {
        command: 'start',
        description: 'Начать работу с ботом',
    },
    {
        command: 'about',
        description: 'О боте',
    },

]);

bot.command('start', async (ctx) => {
    await ctx.reply('Добро пожаловать. Вы активировали бота.');
});

bot.command('about', async (ctx) => {
    await ctx.reply('Это бот обратной связи для пользователей. Он позволяет отправлять сообщения в чат администратора. Бот обрабаотывает текстовые сообщения, фото и PDF файлы.');
});

// ✅ Обновленная логика для команды /help
bot.command('help', async (ctx) => {
    // Проверяем, что ID текущего чата совпадает с ID чата администратора
    if (String(ctx.chat.id) !== CHAT_ID) {
        // Если это не чат администратора, ничего не делаем или отправляем другое сообщение
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
});

bot.command('get_id_chat', async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply(`ID этого чата: ${chatId}`);
});

bot.command('start', async (ctx) => {
    await ctx.reply('Добро пожаловать. Вы активировали бота.');
});

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
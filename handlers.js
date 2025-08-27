const { isUserBlocked } = require('./commands.js');

// Обработчик для текстовых сообщений
const textMessageHandler = async (ctx, CHAT_ID, bot) => {
    // Игнорируем команды, которые начинаются с '/'
    if (ctx.message.text.startsWith('/')) {
        return;
    }
    
    // Проверяем, если сообщение пришло из личного чата
    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        // Пропускаем, если пользователь заблокирован
        if (await isUserBlocked(userId)) return;
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
            
            // Получаем текст сообщения, на которое ответили (учитываем подписи к фото/документам)
            const repliedText = repliedMessage.text || repliedMessage.caption || '';

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
};

// Обработчик для фотографий
const photoMessageHandler = async (ctx, CHAT_ID, bot) => {
    // Проверяем, если сообщение пришло из личного чата
    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        // Пропускаем, если пользователь заблокирован
        if (await isUserBlocked(userId)) return;
        const userName = from.username ? `(@${from.username})` : '';
        const userFullName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

        const header = `Сообщение от ${userFullName} ${userName} - ${userId}:\n#user${userId}`;
        const originalCaption = ctx.message.caption ? `\n\n${ctx.message.caption}` : '';
        const fullCaption = `${header}${originalCaption}`;

        const photoSizes = ctx.message.photo || [];
        const largestPhoto = photoSizes[photoSizes.length - 1];
        if (!largestPhoto) return;

        await bot.api.sendPhoto(Number(CHAT_ID), largestPhoto.file_id, { caption: fullCaption });

    } else if (String(ctx.chat.id) === CHAT_ID) {
        if (ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            const repliedText = repliedMessage.text || repliedMessage.caption || '';
            const match = repliedText.match(/#user(\d+)/);

            if (match && match[1]) {
                const privateChatId = match[1];
                await bot.api.sendMessage(privateChatId, ctx.message.text || '');
                await ctx.reply('Отправляю обратно.');
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
            }
        }
    }
};

// Обработчик для документов (только PDF)
const documentMessageHandler = async (ctx, CHAT_ID, bot) => {
    const document = ctx.message.document;
    if (!document) return;
    const isPdf = document.mime_type === 'application/pdf' || (document.file_name && document.file_name.toLowerCase().endsWith('.pdf'));
    if (!isPdf) return; // Игнорируем не-PDF документы

    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        // Пропускаем, если пользователь заблокирован
        if (await isUserBlocked(userId)) return;
        const userName = from.username ? `(@${from.username})` : '';
        const userFullName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

        const header = `Сообщение от ${userFullName} ${userName} - ${userId}:\n#user${userId}`;
        const originalCaption = ctx.message.caption ? `\n\n${ctx.message.caption}` : '';
        const fullCaption = `${header}${originalCaption}`;

        await bot.api.sendDocument(Number(CHAT_ID), document.file_id, { caption: fullCaption });

    } else if (String(ctx.chat.id) === CHAT_ID) {
        if (ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            const repliedText = repliedMessage.text || repliedMessage.caption || '';
            const match = repliedText.match(/#user(\d+)/);
            
            if (match && match[1]) {
                const privateChatId = match[1];
                await bot.api.sendMessage(privateChatId, ctx.message.text || '');
                await ctx.reply('Отправляю обратно.');
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
            }
        }
    }
};

// Обработчик для остальных сообщений
const otherMessageHandler = async (ctx, bot) => {
    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        // Пропускаем, если пользователь заблокирован
        if (await isUserBlocked(userId)) return;
        await ctx.reply('Я работаю только с текстом, фотографиями и PDF-документами.');
    }
};

module.exports = {
    textMessageHandler,
    photoMessageHandler,
    documentMessageHandler,
    otherMessageHandler,
};

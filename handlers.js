const { isUserBlocked } = require('./commands.js');
const logger = require('./logger');

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
        
        try {
            await bot.api.sendMessage(Number(CHAT_ID), fullMessage);
            logger.debug({ userId, chatType: ctx.chat.type }, 'Текстовое сообщение переслано в админ-чат');
        } catch (err) {
              logger.error(err, 'Не удалось переслать текстовое сообщение');
        }

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
                try {
                    await bot.api.sendMessage(privateChatId, ctx.message.text);
                    await ctx.reply('Отправляю обратно.');
                    logger.debug({ privateChatId }, 'Ответ отправлен пользователю из админ-чата');
                } catch (err) {
                    logger.error({ err }, 'Не удалось отправить ответ из админ-чата');
                }
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
                logger.warn({ repliedText }, 'Не удалось определить пользователя для ответа (текст)');
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

        try {
            await bot.api.sendPhoto(Number(CHAT_ID), largestPhoto.file_id, { caption: fullCaption });
            logger.debug({ userId, chatType: ctx.chat.type }, 'Фото переслано в админ-чат');
        } catch (err) {
              logger.error(err, 'Не удалось переслать фото');
        }

    } else if (String(ctx.chat.id) === CHAT_ID) {
        if (ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            const repliedText = repliedMessage.text || repliedMessage.caption || '';
            const match = repliedText.match(/#user(\d+)/);

            if (match && match[1]) {
                const privateChatId = match[1];
                try {
                    await bot.api.sendMessage(privateChatId, ctx.message.text || '');
                    await ctx.reply('Отправляю обратно.');
                    logger.debug({ privateChatId }, 'Ответ на фото отправлен пользователю');
                } catch (err) {
                    logger.error({ err }, 'Не удалось отправить ответ на фото');
                }
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
                logger.warn({ repliedText }, 'Не удалось определить пользователя для ответа (фото)');
            }
        }
    }
};

// Обработчик для документов (только PDF)
const documentMessageHandler = async (ctx, CHAT_ID, bot) => {
    const document = ctx.message.document;
    if (!document) return;
    const isPdf = document.mime_type === 'application/pdf' || (document.file_name && document.file_name.toLowerCase().endsWith('.pdf'));
    if (!isPdf) {
        await ctx.reply('Отправлять можно только документы с расширением  PDF.');
        return; // Игнорируем не-PDF документы
    } 

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

        try {
            await bot.api.sendDocument(Number(CHAT_ID), document.file_id, { caption: fullCaption });
            logger.debug({ userId, chatType: ctx.chat.type }, 'Документ переслан в админ-чат');
        } catch (err) {
              logger.error(err, 'Не удалось переслать документ');
        }

    } else if (String(ctx.chat.id) === CHAT_ID) {
        if (ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            const repliedText = repliedMessage.text || repliedMessage.caption || '';
            const match = repliedText.match(/#user(\d+)/);
            
            if (match && match[1]) {
                const privateChatId = match[1];
                try {
                    await bot.api.sendMessage(privateChatId, ctx.message.text || '');
                    await ctx.reply('Отправляю обратно.');
                    logger.debug({ privateChatId }, 'Ответ на документ отправлен пользователю');
                } catch (err) {
                    logger.error({ err }, 'Не удалось отправить ответ на документ');
                }
            } else {
                await ctx.reply('Не могу найти пользователя, которому нужно ответить. Возможно, вы отвечаете на сообщение, которое было отправлено до обновления кода.');
                logger.warn({ repliedText }, 'Не удалось определить пользователя для ответа (документ)');
            }
        }
    }
};

// Рассылка
const sendNewsHandler = async (ctx, db, bot, CHAT_ID, logger, GrammyError, HttpError) => {
    // 1. Проверяем, что сообщение пришло из нужного чата
    if (String(ctx.chat.id) !== String(CHAT_ID)) {
        return;
    }
    
    // 2. Получаем текст из подписи к фото или из обычного сообщения
    const messageText = ctx.message.text || ctx.message.caption;

    // 3. Проверяем, существует ли текст и содержит ли он '/send_news'
    if (!messageText || !messageText.includes('/send_news')) {
        return;
    }
    
    // 4. Очищаем текст от команды для рассылки
    const textToSend = messageText.replace('/send_news', '').trim();
    
    // Проверяем, есть ли у сообщения фотография
    const photo = ctx.message.photo;

    // Если есть фото, берем file_id самого большого из них
    const fileId = photo ? photo[photo.length - 1].file_id : null;

    // Нечего рассылать, если нет ни фото, ни текста
    if (!fileId && !textToSend) {
        await ctx.reply("Нечего рассылать. Добавьте текст после команды или прикрепите фото.");
        return;
    }

    // 5. Получаем список всех подписчиков из таблицы bot_users
    try {
        const subscribers = await new Promise((resolve, reject) => {
            db.all('SELECT user_id FROM bot_users', (err, rows) => {
                if (err) { reject(err); } 
                else { resolve(rows.map(row => row.user_id)); }
            });
        });

        // 6. Запускаем рассылку
        let sentCount = 0;
        for (const userId of subscribers) {
            try {
                // Если есть фото, отправляем фото с подписью
                if (fileId) {
                    await bot.api.sendPhoto(userId, fileId, { caption: textToSend });
                } 
                // Иначе отправляем только текст
                else {
                    await bot.api.sendMessage(userId, textToSend);
                }
                sentCount++;
                // Небольшая задержка, чтобы избежать лимитов Telegram
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (err) {
                if (err instanceof GrammyError || err instanceof HttpError) {
                    logger.error(err, `Ошибка при отправке сообщения пользователю ${userId}`);
                }
            }
        }

        // 7. Отправляем подтверждение об окончании рассылки
        await ctx.reply(`Рассылка успешно завершена. Сообщение отправлено ${sentCount} из ${subscribers.length} пользователям.`);

    } catch (err) {
        logger.error("Ошибка при получении списка пользователей:", err);
        await ctx.reply("Произошла ошибка при получении списка подписчиков.");
    }
};
 
// Обработчик для остальных сообщений
const otherMessageHandler = async (ctx, bot) => {
    if (ctx.chat.type === 'private') {
        const from = ctx.from;
        const userId = from.id;
        // Пропускаем, если пользователь заблокирован
        if (await isUserBlocked(userId)) return;
        try {
            await ctx.reply('Я работаю только с текстом, фотографиями и PDF-документами.');
        } catch (err) {
              logger.error(err, 'Не удалось отправить ответ по умолчанию');
        }
    }
};

module.exports = {
    textMessageHandler,
    photoMessageHandler,
    documentMessageHandler,
    otherMessageHandler,
    sendNewsHandler
};

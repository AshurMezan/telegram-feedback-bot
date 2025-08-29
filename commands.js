// Импортируем CHAT_ID, чтобы использовать его в обработчиках
const CHAT_ID = process.env.CHAT_ID;
const db = require('./db.js');
const logger = require('./logger');

// Хелпер: проверка блокировки пользователя
const isUserBlocked = async (userId) => {
	const row = await new Promise((resolve, reject) => {
		db.get('SELECT user_id FROM users WHERE user_id = ?', [userId], (err, result) => {
			if (err) return reject(err);
			resolve(result);
		});
	}).catch(() => null);
	return Boolean(row);
};

const startHandler = async (ctx) => {
    if(ctx.chat.type === 'private') { 
        try {
            await ctx.reply('Добро пожаловать. Вы активировали бота.');
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить ответ на /start');
        }
    } else if (String(ctx.chat.id) === CHAT_ID) {
        try {
            await ctx.reply('Эта команда только для клиентов.');
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить сообщение о доступности только для клиентов (/start)');
        }
    }
};

const aboutHandler = async (ctx) => {
    if(ctx.chat.type === 'private') { 
        try {
            await ctx.reply('Это бот обратной связи для пользователей. Он позволяет отправлять сообщения в чат администратора. Бот обрабатывает текстовые сообщения, фото и PDF файлы.');
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить ответ на /about');
        }
    } else if (String(ctx.chat.id) === CHAT_ID) {
        try {
            await ctx.reply('Эта команда только для клиентов.');
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить сообщение о доступности только для клиентов (/about)');
        }
    }
};

const helpHandler = async (ctx) => {
    if (String(ctx.chat.id) !== CHAT_ID) {
        try {
            await ctx.reply('Я работаю только в определенном чате. Обратитесь к администратору, чтобы получить помощь.');
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить сообщение о неверном чате для /help');
        }
        return;
    }

    const helpMessage = `Команды бота:
/block {user_id} - Блокировка пользователя по его телеграм ID. Пример: /block 950580180
/unblock {user_id} - Разблокировка пользователя по его телеграм ID. Пример: /unblock 950580180
/get_id_chat - Узнать ID чата.`;

    try {
        await ctx.reply(helpMessage);
    } catch (err) {
        logger.error({ err }, 'Не удалось отправить сообщение помощи /help');
    }
};

const getIdChatHandler = async (ctx) => {
    const chatId = ctx.chat.id;
    try {
        await ctx.reply(`ID этого чата: ${chatId}`);
    } catch (err) {
        logger.error({ err }, 'Не удалось отправить ID чата');
    }
};

// Команда блокировки: /block <user_id>
const blockHandler = async (ctx) => {
	if (String(ctx.chat.id) !== CHAT_ID) {
		return;
	}

	const text = ctx.message.text || '';
	const parts = text.trim().split(/\s+/);
	const arg = parts[1];
	const userIdToBlock = arg && /^\d+$/.test(arg) ? Number(arg) : null;

	if (!userIdToBlock) {
		await ctx.reply('Использование: /block <user_id>');
		logger.warn({ text }, 'Некорректное использование команды /block');
		return;
	}

	try {
		await new Promise((resolve, reject) => {
			db.run('INSERT OR IGNORE INTO users (user_id) VALUES (?)', [userIdToBlock], (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
        try {
            await ctx.reply(`Пользователь ${userIdToBlock} заблокирован. Сообщения больше не пересылаются.`);
        } catch (err) {
            logger.error({ err }, 'Не удалось отправить подтверждение блокировки');
        }
	} catch (err) {
        logger.error({ err }, 'Ошибка БД при блокировке');
        try {
		    await ctx.reply('Ошибка базы данных при блокировке.');
        } catch (e) {
            logger.error({ e }, 'Не удалось уведомить об ошибке БД при блокировке');
        }
	}
};

// Команда разблокировки: /unblock <user_id>
const unblockHandler = async (ctx) => {
	if (String(ctx.chat.id) !== CHAT_ID) {
		return;
	}

	const text = ctx.message.text || '';
	const parts = text.trim().split(/\s+/);
	const arg = parts[1];
	const userIdToUnblock = arg && /^\d+$/.test(arg) ? Number(arg) : null;

	if (!userIdToUnblock) {
		await ctx.reply('Использование: /unblock <user_id>');
		logger.warn({ text }, 'Некорректное использование команды /unblock');
		return;
	}

	try {
		await new Promise((resolve, reject) => {
			db.run('DELETE FROM users WHERE user_id = ?', [userIdToUnblock], function (err) {
				if (err) return reject(err);
				resolve(this.changes);
			});
		}).then(async (changes) => {
			if (changes > 0) {
                try {
				    await ctx.reply(`Пользователь ${userIdToUnblock} разблокирован.`);
                } catch (err) {
                    logger.error({ err }, 'Не удалось отправить подтверждение разблокировки');
                }
			} else {
                try {
				    await ctx.reply('Пользователь не найден в списке блокировки.');
                } catch (err) {
                    logger.error({ err }, 'Не удалось отправить сообщение: пользователь не найден в блок-листе');
                }
			}
		});
	} catch (err) {
        logger.error({ err }, 'Ошибка БД при разблокировке');
        try {
		    await ctx.reply('Ошибка базы данных при разблокировке.');
        } catch (e) {
            logger.error({ e }, 'Не удалось уведомить об ошибке БД при разблокировке');
        }
	}
};

// Экспортируем все функции, чтобы они были доступны в других файлах
module.exports = {
    startHandler,
    aboutHandler,
    helpHandler,
    getIdChatHandler,
    blockHandler,
    unblockHandler,
    isUserBlocked,
};
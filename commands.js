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
        // сохраняем пользователя, который запустил бота
        const userId = ctx.from.id;
        try {
            await new Promise((resolve, reject) => {
                db.run('INSERT OR IGNORE INTO bot_users (user_id, created_at) VALUES (?, ?)', [userId, new Date().toISOString()], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } catch (err) {
            logger.error({ err }, 'Ошибка БД при сохранении пользователя /start');
        }

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

// Команда администратора: получить количество пользователей бота
const giveMeAllUsersHandler = async (ctx) => {
    if (String(ctx.chat.id) !== CHAT_ID) {
        return;
    }
    try {
        const count = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS cnt FROM bot_users', [], (err, row) => {
                if (err) return reject(err);
                resolve(row?.cnt || 0);
            });
        });
        await ctx.reply(`Количество пользователей, запустивших бота: ${count}`);
    } catch (err) {
        logger.error({ err }, 'Ошибка БД при подсчете пользователей');
        try {
            await ctx.reply('Не удалось получить количество пользователей.');
        } catch (e) {
            logger.error({ e }, 'Не удалось отправить сообщение о неудаче подсчета');
        }
    }
};

// Команда администратора: список всех user_id (пакетами)
const listUsersHandler = async (ctx) => {
    if (String(ctx.chat.id) !== CHAT_ID) {
        return;
    }
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT user_id FROM bot_users ORDER BY user_id ASC', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        if (rows.length === 0) {
            await ctx.reply('Пока нет пользователей.');
            return;
        }
        const ids = rows.map(r => String(r.user_id));
        const chunkSize = 50; // безопасный размер пакета
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize).join(', ');
            await ctx.reply(`user_id: ${chunk}`);
        }
    } catch (err) {
        logger.error({ err }, 'Ошибка БД при получении списка пользователей');
        try {
            await ctx.reply('Не удалось получить список пользователей.');
        } catch (e) {
            logger.error({ e }, 'Не удалось отправить сообщение о неудаче списка');
        }
    }
};

// Команда администратора: последние N пользователей по дате
const recentUsersHandler = async (ctx) => {
    if (String(ctx.chat.id) !== CHAT_ID) {
        return;
    }
    const text = ctx.message.text || '';
    const parts = text.trim().split(/\s+/);
    const N = Math.min(Math.max(parseInt(parts[1] || '10', 10) || 10, 1), 200); // 1..200
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT user_id, created_at FROM bot_users ORDER BY datetime(created_at) DESC LIMIT ?', [N], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        if (rows.length === 0) {
            await ctx.reply('Пока нет пользователей.');
            return;
        }
        const formatTs = (iso) => {
            const d = new Date(iso);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            const HH = String(d.getHours()).padStart(2, '0');
            const MM = String(d.getMinutes()).padStart(2, '0');
            return `${dd}.${mm}.${yyyy} ${HH}:${MM}`;
        };
        const lines = rows.map(r => `${r.user_id} — ${formatTs(r.created_at)}`);
        const chunkSize = 30;
        for (let i = 0; i < lines.length; i += chunkSize) {
            await ctx.reply(lines.slice(i, i + chunkSize).join('\n'));
        }
    } catch (err) {
        logger.error({ err }, 'Ошибка БД при получении последних пользователей');
        try {
            await ctx.reply('Не удалось получить последних пользователей.');
        } catch (e) {
            logger.error({ e }, 'Не удалось отправить сообщение о неудаче последних пользователей');
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
/get_id_chat - Узнать ID чата.
/give_me_all_users - Сколько человек запустили бота.
/list_users - Список всех user_id (пакетами).
/recent_users [N] - Последние N пользователей (по умолчанию 10, максимум 200).`;

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
    giveMeAllUsersHandler,
    listUsersHandler,
    recentUsersHandler,
};
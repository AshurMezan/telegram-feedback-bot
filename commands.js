// Импортируем CHAT_ID, чтобы использовать его в обработчиках
const CHAT_ID = process.env.CHAT_ID;
const db = require('./db.js');

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
        await ctx.reply('Добро пожаловать. Вы активировали бота.');
    } else if (String(ctx.chat.id) === CHAT_ID) {
        await ctx.reply('Эта команда только для клиентов.');
    }
};

const aboutHandler = async (ctx) => {
    if(ctx.chat.type === 'private') { 
        await ctx.reply('Это бот обратной связи для пользователей. Он позволяет отправлять сообщения в чат администратора. Бот обрабатывает текстовые сообщения, фото и PDF файлы.');
    } else if (String(ctx.chat.id) === CHAT_ID) {
        await ctx.reply('Эта команда только для клиентов.');
    }
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
		return;
	}

	try {
		await new Promise((resolve, reject) => {
			db.run('INSERT OR IGNORE INTO users (user_id) VALUES (?)', [userIdToBlock], (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
		await ctx.reply(`Пользователь ${userIdToBlock} заблокирован. Сообщения больше не пересылаются.`);
	} catch (err) {
		await ctx.reply('Ошибка базы данных при блокировке.');
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
				await ctx.reply(`Пользователь ${userIdToUnblock} разблокирован.`);
			} else {
				await ctx.reply('Пользователь не найден в списке блокировки.');
			}
		});
	} catch (err) {
		await ctx.reply('Ошибка базы данных при разблокировке.');
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
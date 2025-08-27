require('dotenv').config(); // импортируем переменные окружения
const { Bot } = require('grammy'); // импортируем бота
const menu = require('./menu.js'); // Импортируем кнопку "Меню"
const db = require('./db.js'); // Импортировали базу данных
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

// Хелпер: проверка, заблокирован ли пользователь
async function isUserBlocked(userId) {
	const row = await new Promise((resolve, reject) => {
		db.get('SELECT user_id FROM users WHERE user_id = ?', [userId], (err, result) => {
			if (err) return reject(err);
			resolve(result);
		});
	}).catch(() => null);
	return Boolean(row);
}

// Команда: /block <user_id> — доступна только в админском чате
bot.command('block', async (ctx) => {
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
})

// Команда: /unblock <user_id> — удаляет пользователя из списка блокировки (только админ-чат)
bot.command('unblock', async (ctx) => {
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
			// Используем function, чтобы получить this.changes
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
})
// Обработчик для всех текстовых сообщений
bot.on('message:text', async (ctx) => {
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
});


bot.start();
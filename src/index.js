require('dotenv').config();
const { readdirSync } = require('fs');
const { join } = require('path');
const MusicClient = require('./struct/Client');
const { Collection } = require('discord.js');
const client = new MusicClient({ token: process.env.DISCORD_TOKEN, prefix: process.env.DISCORD_PREFIX, debug: process.env.DEBUG });

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(join(__dirname, 'commands', `${file}`));
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	console.log(`Logado com o bot ${client.user.tag} em ${client.guilds.cache.size} servidores`);
	client.user.setActivity(';ajuda ou ;comandos', { type: 'PLAYING' })
});

client.on('message', message => {
	// !abc #nomedocanal
	if (message.attachments.size > 0 && message.content.split(' ')[0] == `${client.config.prefix}imagem`) {
		if (message.author.id == client.user.id) {
			return;
		}
		return client.commands.get('imagem').execute(client, message);
	}

	if (client.config.debug) {
		console.log(`${message.author}: ${message.content}`);
	}
	if (!message.content.startsWith(client.config.prefix) || message.author.bot) return;
	const args = message.content.slice(client.config.prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));


	if (message.content == ';testando') {
		console.log(args);
		console.log(commandName);
		console.log(command);
	}


	if (!command) return;
	if (command.guildOnly && message.channel.type !== 'text') return message.reply('oi.. por que está sussurando aqui no privado? hihi.. enfim, não posso executar nenhum comando no privado, apenas nos canais de bot!');
	if (command.args && !args.length) {
		let reply = `quase fiz o que pediu, só faltou dizer o comando!, ${message.author}!`;
		if (command.usage) reply += `\nÉ..quase isso! O certo seria: \`${client.config.prefix}${command.name} ${command.usage}\``;
		return message.channel.send(reply);
	}
	if (!client.cooldowns.has(command.name)) {
		client.cooldowns.set(command.name, new Collection());
	}
	const now = Date.now();
	const timestamps = client.cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;
	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`epa, vai com calma! Espere ${timeLeft.toFixed(1)} segundos para usar o comando \`${command.name}\``);
		}
	}
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	try {
		command.execute(client, message, args);
	} catch (error) {
		console.error(error);
		message.reply('ocorreu um erro durante a execução deste comando, vou me auto investigar!');
		//message.reply('ocorreu um erro durante a execução deste comando, o desenvolvedor saiu para tomar café, mas ele já volta para corrigir o problema!');
	}
});


client.on('guildMemberAdd', member => {
	const channel = member.guild.channels.cache.find(ch => ch.name === 'member-log');
	if (!channel) return;
	channel.send(`Bem vindo ao servidor, ${member}!! Leia as regras e divirta-se!`);
});

client.on('guildMemberRemove', member => {
	const channel = member.guild.channels.cache.find(ch => ch.name === 'member-log');
	if (!channel) return;
	channel.send(`${member} saiu do servidor... :/`);
});

client.login(client.config.DISCORD_TOKEN);
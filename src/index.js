// src/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- Load commands dynamically ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands'); // src/commands
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] Command at ${file} missing "data" or "execute".`);
    }
}

// --- Ready event ---
client.once('ready', () => {
    console.log(`${client.user.tag} is online.`);
});

// --- Slash commands ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorChannel = client.channels.cache.get(process.env.ERROR_CHANNEL_ID);
        if (errorChannel) await logger.error(errorChannel, error.stack || error.message || String(error));

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'There was an error executing this command.' });
        } else {
            await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
        }
    }
});

// --- Prefix commands (e.g., !ping) ---
const PREFIX = '!';
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute({
            client,
            guild: message.guild,
            channel: message.channel,
            user: message.author,
            createdTimestamp: message.createdTimestamp
        });
    } catch (err) {
        console.error(err);
        message.channel.send('Error executing command.');
    }
});

// --- Global unhandled promise rejection handler ---
process.on('unhandledRejection', async err => {
    console.error('Unhandled promise rejection:', err);
    const errorChannel = client.channels.cache.get(process.env.ERROR_CHANNEL_ID);
    if (errorChannel) await logger.error(errorChannel, err.stack || err.message || String(err));
});

// --- Login ---
client.login(process.env.BOT_TOKEN);

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

const auditIdFilePath = path.join(dataPath, 'audit_id.json');
const errorIdFilePath = path.join(dataPath, 'error_id.json');

function getNextId(filePath) {
    let id = 1;
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        id = data.lastId + 1;
    }
    fs.writeFileSync(filePath, JSON.stringify({ lastId: id }, null, 2));
    return id;
}

// --- Audit logging ---
async function audit(title, { user, command, details, guild, channel }) {
    if (!channel) return;

    const commandId = getNextId(auditIdFilePath);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x3B98CD)
        .addFields([
            { name: 'ID#', value: commandId.toString(), inline: true },
            { name: 'User', value: `<@${user.id}>`, inline: true },
            { name: 'Command', value: command, inline: true },
            { name: 'Details', value: details || 'None', inline: false },
            { name: 'Guild', value: guild ? guild.toString() : 'N/A', inline: false }
        ])
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Logger error:', err);
    }
}

// --- Error logging ---
async function error(channel, errorMessage) {
    if (!channel) return;

    const errorId = getNextId(errorIdFilePath);

    const embed = new EmbedBuilder()
        .setTitle('Error Log')
        .setColor(0xFF0000)
        .addFields([
            { name: 'ID#', value: errorId.toString(), inline: true },
            { name: 'Error', value: `\`\`\`${errorMessage}\`\`\``, inline: false }
        ])
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Logger error:', err);
    }
}

module.exports = { audit, error };
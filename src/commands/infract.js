const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infract')
        .setDescription('Issue an infraction to a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user receiving the infraction.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the infraction.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('outcome')
                .setDescription('Outcome of the infraction.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Optional additional notes.')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const outcome = interaction.options.getString('outcome');
        const notes = interaction.options.getString('notes') || 'N/A.';
        const moderator = interaction.user;

        // --- Ensure data folder exists ---
        const dataPath = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

        // --- Store infraction in JSON ---
        const filePath = path.join(dataPath, 'infractions.json');
        const arr = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];

        const entry = {
            id: Date.now().toString(),
            targetId: target.id,
            targetTag: target.tag,
            reason,
            outcome,
            notes,
            issuedBy: moderator.tag,
            timestamp: new Date().toISOString()
        };

        arr.push(entry);
        fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');

        // --- Send infraction embed in server ---
        const embed = new EmbedBuilder()
            .setTitle('Infraction')
            .setDescription('<:VASRPLine:1417743039069163570>'.repeat(14))
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields([
                { name: '> User', value: `<@${target.id}>`, inline: false },
                { name: '> Reason', value: `\`${reason}\``, inline: false },
                { name: '> Outcome', value: outcome, inline: true },
                { name: '> Notes', value: notes, inline: false },
                { name: '> Issued By', value: `<@${moderator.id}>`, inline: false }
            ])
            .setColor(0xE0242B)
            .setFooter({ text: `${target.username} received an infraction.`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const infractionsChannel = interaction.guild.channels.cache.get('1414801026887712807');
        if (infractionsChannel) {
            await infractionsChannel.send({ embeds: [embed] });
        }

        // --- External audit log ---
        const auditChannel = interaction.client.channels.cache.get(process.env.AUDIT_CHANNEL_ID);
        logger.audit('Infraction Issued', {
            user: target,
            command: '/infract',
            details: `Reason: \`${reason}\`\nOutcome: ${outcome}\nNotes: ${notes}\nIssued by: <@${moderator.id}>`,
            guild: interaction.guild.id,
            channel: auditChannel
        });

        // --- Interaction acknowledgement ---
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: `Infraction logged for ${target.tag}.` });
    }
};
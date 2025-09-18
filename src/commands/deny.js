const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DENY_CHANNEL_ID = '1414801026674065436';

const dataPath = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

const deniesFilePath = path.join(dataPath, 'denies.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deny')
        .setDescription('Deny an officer application.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user who failed the application.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Why did they fail the application?')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        const moderator = interaction.user;
        const reason = interaction.options.getString('reason');

        // Denial embed
        const embed = new EmbedBuilder()
            .setTitle('Officer Application - VSP Management')
            .setDescription(`**Sadly, <@${target.id}> you have failed your Officer Application.**`)
            .addFields([
                { name: '> Reason:', value: reason, inline: false },
                { name: '> Denied by:', value: `<@${moderator.id}>`, inline: false }
            ])
            .setColor(0x3B98CD)
            .setThumbnail(interaction.client.user.displayAvatarURL()) // Bot PFP top-left
            .setFooter({ text: `${target.tag} was denied.`, iconURL: target.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTimestamp();

        // Send to deny channel
        const channel = interaction.guild.channels.cache.get(DENY_CHANNEL_ID);
        if (channel) await channel.send({ content: `<@${target.id}>`, embeds: [embed] });

        // --- Save to denies.json ---
        const denyEntry = {
            id: Date.now().toString(),
            targetId: target.id,
            targetTag: target.tag,
            deniedBy: moderator.tag,
            reason: reason,
            timestamp: new Date().toISOString()
        };

        const denyArr = fs.existsSync(deniesFilePath) ? JSON.parse(fs.readFileSync(deniesFilePath, 'utf8')) : [];
        denyArr.push(denyEntry);
        fs.writeFileSync(deniesFilePath, JSON.stringify(denyArr, null, 2), 'utf8');

        // External audit
        const auditChannel = interaction.client.channels.cache.get(process.env.AUDIT_CHANNEL_ID);
        logger.audit('User denied', {
            user: target,
            command: '/deny',
            details: `Denied by: <@${moderator.id}>\nReason: ${reason}`,
            guild: interaction.guild.id,
            channel: auditChannel
        });

        // Interaction response
        await interaction.reply({ content: `${target.tag} has been denied.`, ephemeral: true });
    }
};
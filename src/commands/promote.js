const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('Promote a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user being promoted.')
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName('rank')
                .setDescription('The new rank.')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the promotion.')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const rank = interaction.options.getRole('rank');
        const reason = interaction.options.getString('reason');
        const moderator = interaction.user;

        // --- Create promotion entry ---
        const dataPath = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

        const filePath = path.join(dataPath, 'promotions.json');
        const arr = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];

        const entry = {
            id: Date.now().toString(),
            targetId: target.id,
            targetTag: target.tag,
            rankName: rank.name,
            rankId: rank.id,
            reason,
            promotedBy: moderator.tag,
            timestamp: new Date().toISOString()
        };

        arr.push(entry);
        fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');

        // --- Send promotion message in server ---
        const embed = new EmbedBuilder()
            .setTitle('Promotion')
            .setDescription('<:ModerationLine:1417707612794785792>'.repeat(14))
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields([
                { name: '> New Rank: ', value: `<@&${rank.id}>`, inline: false },
                { name: '> Reason: ', value: `\`${reason}\``, inline: false },
                { name: '> Promoted By: ', value: `<@${moderator.id}>`, inline: false }
            ])
            .setColor(0x3B98CD)
            .setFooter({ text: `${target.username} was promoted.`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const promotionsChannel = interaction.guild.channels.cache.get('1414801026887712806');
        if (promotionsChannel) {
            await promotionsChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
        }

        // --- Single external audit log (logger handles ID increment) ---
        const auditChannel = interaction.client.channels.cache.get(process.env.AUDIT_CHANNEL_ID);
        logger.audit('User promoted', {
            user: target,
            command: '/promote',
            details: `Rank: ${rank.name} | ${rank.id}\nReason: \`${reason}\`\nPromoted by: <@${moderator.id}>`,
            guild: interaction.guild.id,
            channel: auditChannel
        });

        // --- Interaction acknowledgement ---
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: `Promotion logged for ${target.tag}.` });
    }
};
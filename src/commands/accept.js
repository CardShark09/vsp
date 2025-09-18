const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ACCEPT_CHANNEL_ID = '1414801026674065436';
const HARDCODED_ROLE_IDS = ['1414801025885278302', '1414801025923158104'];

const dataPath = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

const acceptsFilePath = path.join(dataPath, 'accepts.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('accept')
        .setDescription('Accept an officer application.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user who passed the application.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(target.id);
        const moderator = interaction.user;

        // Assign roles
        for (const roleId of HARDCODED_ROLE_IDS) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role).catch(console.error);
            }
        }

        // Acceptance embed (original style)
        const embed = new EmbedBuilder()
            .setTitle('Officer Application')
            .setDescription(`**Congratulations <@${target.id}> on passing your Officer Application!**`)
            .addFields([
                { name: '> Accepted by:', value: `<@${moderator.id}>`, inline: false }
            ])
            .setColor(0x3B98CD)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: `${target.username} was accepted.`, iconURL: target.displayAvatarURL() })
            .setTimestamp();

        // Send to acceptance channel
        const channel = interaction.guild.channels.cache.get(ACCEPT_CHANNEL_ID);
        if (channel) {
            await channel.send({ content: `<@${target.id}>`, embeds: [embed] });
        }

        // --- Save to accepts.json ---
        const acceptEntry = {
            id: Date.now().toString(),
            targetId: target.id,
            targetTag: target.tag,
            assignedRoles: HARDCODED_ROLE_IDS,
            acceptedBy: moderator.tag,
            timestamp: new Date().toISOString()
        };

        const acceptArr = fs.existsSync(acceptsFilePath) ? JSON.parse(fs.readFileSync(acceptsFilePath, 'utf8')) : [];
        acceptArr.push(acceptEntry);
        fs.writeFileSync(acceptsFilePath, JSON.stringify(acceptArr, null, 2), 'utf8');

        // External audit
        logger.audit('User accepted', {
            user: target,
            command: '/accept',
            extra: `Assigned roles: ${HARDCODED_ROLE_IDS.map(r => `<@&${r}>`).join(', ')}\nAccepted by: <@${moderator.id}>`,
            guild: interaction.guild.id,
            channel: interaction.client.channels.cache.get(process.env.AUDIT_CHANNEL_ID)
        });

        // Interaction response
        await interaction.reply({ content: `${target.tag} has been accepted and assigned roles.`, ephemeral: true });
    }
};
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency/status'),

    async execute(interaction) {
        const client = interaction.client;
        const latency = client.ws.ping;
        const uptime = Math.floor(client.uptime / 1000); // seconds
        const uptimeString = `<t:${Math.floor(Date.now() / 1000) - uptime}:R>`; // Discord relative timestamp
        const botAvatar = client.user.displayAvatarURL({ size: 1024 });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: 'VSP Management',
                iconURL: client.user.displayAvatarURL(),
            })
            .setTitle('Bot Status — Virginia State Police')
            .setColor(0x3B98CD)
            .setThumbnail(botAvatar) // top-left
            .addFields([
                { name: 'Information', value: `> Latency: \`${latency}ms\`\n> Uptime: ${uptimeString}\n> Database Connection: \`Connected\`` },
            ])
            .setTimestamp();

        if (interaction.reply) {
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.channel) {
            await interaction.channel.send({ embeds: [embed] });
        }
    }
};
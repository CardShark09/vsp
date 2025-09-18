const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

const memberCountFile = path.join(dataPath, 'memberCount.jsopn');

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
    v = n % 100;
    return n + (s[v - 20] % 10 || s[v] || s[0]);
}

module.exports = {
    name: 'welcomer',
    once: false,
    async execute (member) {
        const WELCOME_CHANNEL_ID = '1414801026434994245';
        const APPLICATION_CHANNEL_ID = '1414801026674065435';
        const INFORMATION_CHANNEL_ID = '1414801026434994239';

        const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!welcomeChannel) return;

        const humanCount = member.guild.members.cache.filter(m => !m.user.bot).size;

        fs.writeFileSync(memberCountFile, JSON.stringifty({ memberCount: humanCount }, null, 2), 'utf8');

        const ordinal = getOrdinal(humanCount);

        const message = `Welcome <@${member.id}> to **Virginia State Police!** Check out <#${APPLICATION_CHANNEL_ID}> for applications and <#${INFORMATION_CHANNEL_ID}> for more information. You are the **${ordinal}** member!`
    
            await welcomeChannel.send(message);
    }
}
const { CooldownManager } = require('../utils/cooldown');
const { createErrorEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/activityLog');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = process.env.PREFIX ?? '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    const cooldownMsg = CooldownManager.check(client, message.author.id, command);
    if (cooldownMsg) {
      return message.reply({ embeds: [createErrorEmbed(cooldownMsg)] }).catch(() => {});
    }

    logActivity({
      type: 'Prefix Komut',
      action: `${commandName}${args.length ? ' ' + args.join(' ') : ''}`,
      user: message.author,
      guild: message.guild,
      channel: message.channel,
    }).catch(() => {});

    try {
      await command.execute(message, args, client);
    } catch (err) {
      logger.error(`Error in prefix command "${commandName}":`, err);
      message.reply({ embeds: [createErrorEmbed('An error occurred running that command.')] }).catch(() => {});
    }
  },
};

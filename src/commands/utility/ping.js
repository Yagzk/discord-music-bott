const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Show bot latency',
  category: 'utility',
  cooldown: 5,

  data: new SlashCommandBuilder().setName('ping').setDescription('Show bot latency'),

  async execute(message, _args, client) {
    const sent = await message.reply('Pinging…');
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws = Math.round(client.ws.ping);
    await sent.edit({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF88')
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Roundtrip', value: `${roundtrip}ms`, inline: true },
            { name: 'WebSocket', value: `${ws}ms`, inline: true },
          ),
      ],
    });
  },

  async slashExecute(interaction, client) {
    const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = Math.round(client.ws.ping);
    await interaction.editReply({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF88')
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Roundtrip', value: `${roundtrip}ms`, inline: true },
            { name: 'WebSocket', value: `${ws}ms`, inline: true },
          ),
      ],
    });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'clear',
  description: 'Clear all upcoming songs from the queue',
  aliases: ['clearqueue', 'cq'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder().setName('clear').setDescription('Clear all upcoming songs from the queue'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player || player.queue.getAllUpcoming().length === 0) {
      return message.reply({ embeds: [createErrorEmbed('There are no upcoming songs to clear!')] });
    }

    const count = player.queue.getAllUpcoming().length;
    player.queue.clearUpcoming();
    await message.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** upcoming song(s) from the queue.`)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player || player.queue.getAllUpcoming().length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('There are no upcoming songs to clear!')], ephemeral: true });
    }

    const count = player.queue.getAllUpcoming().length;
    player.queue.clearUpcoming();
    await interaction.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** upcoming song(s) from the queue.`)] });
  },
};

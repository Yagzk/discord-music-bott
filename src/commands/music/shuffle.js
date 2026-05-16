const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'shuffle',
  description: 'Shuffle the upcoming songs in the queue',
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the upcoming songs in the queue'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player || player.queue.getAllUpcoming().length < 2) {
      return message.reply({ embeds: [createErrorEmbed('Need at least 2 upcoming songs to shuffle!')] });
    }

    player.queue.shuffle();
    await message.reply({ embeds: [createSuccessEmbed('🔀 Queue shuffled!')] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player || player.queue.getAllUpcoming().length < 2) {
      return interaction.reply({ embeds: [createErrorEmbed('Need at least 2 upcoming songs to shuffle!')], ephemeral: true });
    }

    player.queue.shuffle();
    await interaction.reply({ embeds: [createSuccessEmbed('🔀 Queue shuffled!')] });
  },
};

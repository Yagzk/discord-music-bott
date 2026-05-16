const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'clearfilters',
  description: 'Remove all active audio filters',
  aliases: ['cf', 'nofilter', 'resetfilters'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder().setName('clearfilters').setDescription('Remove all active audio filters'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    if (Object.keys(player.activeFilters).length === 0) {
      return message.reply({ embeds: [createErrorEmbed('No filters are currently active.')] });
    }

    await player.clearFilters();
    await message.reply({ embeds: [createSuccessEmbed('All audio filters cleared.')] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    if (Object.keys(player.activeFilters).length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('No filters are currently active.')], ephemeral: true });
    }

    await interaction.deferReply();
    await player.clearFilters();
    await interaction.editReply({ embeds: [createSuccessEmbed('All audio filters cleared.')] });
  },
};

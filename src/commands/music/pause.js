const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'pause',
  description: 'Pause the current song',
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current song'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    const ok = player.pause();
    await message.reply({
      embeds: [ok ? createSuccessEmbed('Paused ⏸') : createErrorEmbed('Already paused.')],
    });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    const ok = player.pause();
    await interaction.reply({
      embeds: [ok ? createSuccessEmbed('Paused ⏸') : createErrorEmbed('Already paused.')],
    });
  },
};

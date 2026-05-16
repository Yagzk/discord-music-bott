const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'skip',
  description: 'Skip the current song',
  aliases: ['s', 'next'],
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    const current = player.queue.currentSong;
    const skipped = await player.skip();

    if (!skipped) {
      return message.reply({ embeds: [createSuccessEmbed(`Skipped **${current?.title}**. Queue is now empty.`)] });
    }

    await message.reply({ embeds: [createSuccessEmbed(`Skipped **${current?.title}**`)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    const current = player.queue.currentSong;
    const skipped = await player.skip();

    if (!skipped) {
      return interaction.reply({ embeds: [createSuccessEmbed(`Skipped **${current?.title}**. Queue is now empty.`)] });
    }

    await interaction.reply({ embeds: [createSuccessEmbed(`Skipped **${current?.title}**`)] });
  },
};

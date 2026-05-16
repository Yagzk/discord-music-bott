const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'stop',
  description: 'Stop playback and clear the queue',
  aliases: ['disconnect', 'dc'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    player.stop();
    // Leave voice channel and remove player instance
    player.disconnect();
    client.musicPlayers.delete(message.guild.id);

    await message.reply({ embeds: [createSuccessEmbed('Stopped playback and cleared the queue.')] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    player.stop();
    player.disconnect();
    client.musicPlayers.delete(interaction.guild.id);

    await interaction.reply({ embeds: [createSuccessEmbed('Stopped playback and cleared the queue.')] });
  },
};

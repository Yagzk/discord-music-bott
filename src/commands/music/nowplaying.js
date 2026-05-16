const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createNowPlayingEmbed } = require('../../utils/embeds');
const { createMusicControlRows } = require('../../utils/musicControls');

module.exports = {
  name: 'nowplaying',
  description: 'Show the currently playing song',
  aliases: ['np', 'current'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the currently playing song'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    const song = player?.queue.currentSong;
    if (!player?.isPlaying || !song) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }
    await message.reply({ embeds: [createNowPlayingEmbed(song, player)], components: createMusicControlRows(player) });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    const song = player?.queue.currentSong;
    if (!player?.isPlaying || !song) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }
    await interaction.reply({ embeds: [createNowPlayingEmbed(song, player)], components: createMusicControlRows(player) });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createQueueEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'queue',
  description: 'Show the song queue',
  aliases: ['q', 'list'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the song queue')
    .addIntegerOption(opt =>
      opt.setName('page').setDescription('Page number').setMinValue(1),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player || player.queue.isEmpty) {
      return message.reply({ embeds: [createErrorEmbed('The queue is empty!')] });
    }

    const page = parseInt(args[0]) || 1;
    const upcoming = player.queue.getAllUpcoming();
    await message.reply({ embeds: [createQueueEmbed(upcoming, player.queue.currentSong, page)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player || player.queue.isEmpty) {
      return interaction.reply({ embeds: [createErrorEmbed('The queue is empty!')], ephemeral: true });
    }

    const page = interaction.options.getInteger('page') ?? 1;
    const upcoming = player.queue.getAllUpcoming();
    await interaction.reply({ embeds: [createQueueEmbed(upcoming, player.queue.currentSong, page)] });
  },
};

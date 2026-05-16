const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'remove',
  description: 'Remove a song from the queue by position',
  aliases: ['rm', 'delete'],
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue by position')
    .addIntegerOption(opt =>
      opt.setName('position').setDescription('Queue position to remove').setRequired(true).setMinValue(1),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player || player.queue.isEmpty) {
      return message.reply({ embeds: [createErrorEmbed('The queue is empty!')] });
    }

    const pos = parseInt(args[0]);
    if (isNaN(pos) || pos < 1) {
      return message.reply({ embeds: [createErrorEmbed('Please provide a valid queue position.')] });
    }

    const upcoming = player.queue.getAllUpcoming();
    // Position is relative to upcoming list
    if (pos > upcoming.length) {
      return message.reply({ embeds: [createErrorEmbed(`Position out of range. There are ${upcoming.length} upcoming songs.`)] });
    }

    // Convert upcoming position to absolute queue position
    const absolutePos = player.queue.currentIndex + 1 + pos;
    const removed = player.queue.remove(absolutePos);

    await message.reply({ embeds: [createSuccessEmbed(`Removed **${removed.title}** from the queue.`)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player || player.queue.isEmpty) {
      return interaction.reply({ embeds: [createErrorEmbed('The queue is empty!')], ephemeral: true });
    }

    const pos = interaction.options.getInteger('position');
    const upcoming = player.queue.getAllUpcoming();

    if (pos > upcoming.length) {
      return interaction.reply({
        embeds: [createErrorEmbed(`Position out of range. There are ${upcoming.length} upcoming songs.`)],
        ephemeral: true,
      });
    }

    const absolutePos = player.queue.currentIndex + 1 + pos;
    const removed = player.queue.remove(absolutePos);

    await interaction.reply({ embeds: [createSuccessEmbed(`Removed **${removed.title}** from the queue.`)] });
  },
};

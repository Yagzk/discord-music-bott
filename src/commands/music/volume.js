const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed } = require('../../utils/embeds');

const UNLIMITED_VOLUME_USER_ID = '228879453399285760';
const DEFAULT_MAX_VOLUME = 50;

module.exports = {
  name: 'volume',
  description: 'Get or set the playback volume (0–100)',
  aliases: ['vol', 'v'],
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Get or set the playback volume (0–100)')
    .addIntegerOption(opt =>
      opt.setName('level').setDescription('Volume level').setMinValue(0),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    if (!args.length) {
      return message.reply({ embeds: [createInfoEmbed('🔊 Volume', `Current volume: **${player.volume}%**`)] });
    }

    const level = parseInt(args[0], 10);
    const error = validateVolume(level, message.author.id);
    if (error) {
      return message.reply({ embeds: [createErrorEmbed(error)] });
    }

    player.setVolume(level);
    await message.reply({ embeds: [createSuccessEmbed(`Volume set to **${level}%**`)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    const level = interaction.options.getInteger('level');
    if (level === null) {
      return interaction.reply({ embeds: [createInfoEmbed('🔊 Volume', `Current volume: **${player.volume}%**`)] });
    }

    const error = validateVolume(level, interaction.user.id);
    if (error) {
      return interaction.reply({ embeds: [createErrorEmbed(error)], ephemeral: true });
    }

    player.setVolume(level);
    await interaction.reply({ embeds: [createSuccessEmbed(`Volume set to **${level}%**`)] });
  },
};

function validateVolume(level, userId) {
  if (Number.isNaN(level) || level < 0) {
    return 'Volume must be **0** or higher.';
  }

  if (userId !== UNLIMITED_VOLUME_USER_ID && level > DEFAULT_MAX_VOLUME) {
    return 'sen yağız değilsin';
  }

  return null;
}

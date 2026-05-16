const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

// Bass boost levels mapped to FFmpeg bass filter gain values
const LEVELS = { low: 10, medium: 20, high: 30, max: 50 };

module.exports = {
  name: 'bassboost',
  description: 'Toggle/set bass boost (off | low | medium | high | max | 0-100)',
  aliases: ['bb', 'bass'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('bassboost')
    .setDescription('Toggle/set bass boost')
    .addStringOption(opt =>
      opt
        .setName('level')
        .setDescription('Boost level')
        .setRequired(true)
        .addChoices(
          { name: '⬛ Off', value: 'off' },
          { name: '🔉 Low', value: 'low' },
          { name: '🔊 Medium (default)', value: 'medium' },
          { name: '🔊🔊 High', value: 'high' },
          { name: '💥 Max', value: 'max' },
        ),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    const input = (args[0] ?? '').toLowerCase();
    return applyBassboost(input, player, msg => message.reply({ embeds: [msg] }));
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    await interaction.deferReply();
    const level = interaction.options.getString('level');
    await applyBassboost(level, player, msg => interaction.editReply({ embeds: [msg] }));
  },
};

async function applyBassboost(input, player, reply) {
  if (!input || input === 'off') {
    await player.removeFilter('bassboost');
    return reply(createSuccessEmbed('Bass boost **disabled**.'));
  }

  let gain;
  if (LEVELS[input] !== undefined) {
    gain = LEVELS[input];
  } else {
    gain = parseInt(input);
    if (isNaN(gain) || gain < 0 || gain > 100) {
      return reply(createErrorEmbed('Usage: `!bassboost <off | low | medium | high | max | 0-100>`'));
    }
  }

  await player.applyFilter('bassboost', `bass=g=${gain}`);
  return reply(createSuccessEmbed(`Bass boost set to **+${gain}dB**`));
}

const { SlashCommandBuilder } = require('discord.js');
const { LOOP_MODES } = require('../../player/Queue');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

const MODE_LABELS = { none: '⬛ Off', track: '🔂 Track', queue: '🔁 Queue' };
const VALID_MODES = Object.keys(MODE_LABELS);

module.exports = {
  name: 'loop',
  description: 'Set loop mode: none / track / queue',
  aliases: ['repeat'],
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(opt =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: '⬛ Off', value: 'none' },
          { name: '🔂 Track', value: 'track' },
          { name: '🔁 Queue', value: 'queue' },
        ),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    const mode = args[0]?.toLowerCase();
    if (!mode || !VALID_MODES.includes(mode)) {
      return message.reply({
        embeds: [createErrorEmbed(`Usage: \`!loop <${VALID_MODES.join(' | ')}>\`\nCurrent: ${MODE_LABELS[player.loopMode]}`)],
      });
    }

    player.queue.setLoopMode(LOOP_MODES[mode.toUpperCase()]);
    await message.reply({ embeds: [createSuccessEmbed(`Loop mode set to ${MODE_LABELS[mode]}`)] });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    const mode = interaction.options.getString('mode');
    player.queue.setLoopMode(LOOP_MODES[mode.toUpperCase()]);
    await interaction.reply({ embeds: [createSuccessEmbed(`Loop mode set to ${MODE_LABELS[mode]}`)] });
  },
};

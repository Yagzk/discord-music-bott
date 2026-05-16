const { SlashCommandBuilder } = require('discord.js');
const { AUDIO_FILTERS } = require('../../player/AudioFilters');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed } = require('../../utils/embeds');

const FILTER_NAMES = Object.keys(AUDIO_FILTERS);

module.exports = {
  name: 'filter',
  description: 'Apply or remove a named audio filter',
  aliases: ['ef', 'effect'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply or remove an audio filter')
    .addStringOption(opt =>
      opt
        .setName('name')
        .setDescription('Filter name (or "list" to see all)')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(opt =>
      opt
        .setName('action')
        .setDescription('add (default) or remove')
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }),
    ),

  async execute(message, args, client) {
    const player = client.musicPlayers.get(message.guild.id);

    const name = args[0]?.toLowerCase();
    if (!name || name === 'list') {
      const list = FILTER_NAMES.map(f => `\`${f}\``).join(', ');
      const active = Object.keys(player?.activeFilters ?? {}).join(', ') || 'None';
      return message.reply({
        embeds: [createInfoEmbed('🎛 Audio Filters', `**Available:** ${list}\n**Active:** ${active}`)],
      });
    }

    if (!player?.isPlaying) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
    }

    const action = args[1]?.toLowerCase() === 'remove' ? 'remove' : 'add';
    await handleFilter(name, action, player, msg => message.reply({ embeds: [msg] }));
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    const name = interaction.options.getString('name').toLowerCase();

    if (name === 'list') {
      const list = FILTER_NAMES.map(f => `\`${f}\``).join(', ');
      const active = Object.keys(player?.activeFilters ?? {}).join(', ') || 'None';
      return interaction.reply({
        embeds: [createInfoEmbed('🎛 Audio Filters', `**Available:** ${list}\n**Active:** ${active}`)],
      });
    }

    if (!player?.isPlaying) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
    }

    await interaction.deferReply();
    const action = interaction.options.getString('action') ?? 'add';
    await handleFilter(name, action, player, msg => interaction.editReply({ embeds: [msg] }));
  },

  async autocomplete(interaction) {
    const query = interaction.options.getFocused().toLowerCase();
    const matches = FILTER_NAMES.filter(f => f.includes(query)).slice(0, 25);
    await interaction.respond(matches.map(f => ({ name: f, value: f }))).catch(() => {});
  },
};

async function handleFilter(name, action, player, reply) {
  if (!AUDIO_FILTERS[name]) {
    const list = FILTER_NAMES.map(f => `\`${f}\``).join(', ');
    return reply(createErrorEmbed(`Unknown filter \`${name}\`.\n**Available:** ${list}`));
  }

  if (action === 'remove') {
    await player.removeFilter(name);
    return reply(createSuccessEmbed(`Removed filter **${name}**.`));
  }

  await player.applyFilter(name, AUDIO_FILTERS[name]);
  return reply(createSuccessEmbed(`Applied filter **${name}**.`));
}

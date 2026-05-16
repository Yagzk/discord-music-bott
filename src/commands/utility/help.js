const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const COMMANDS = [
  { name: 'play <query>', desc: 'Play a song (URL or search)' },
  { name: 'skip', desc: 'Skip the current song' },
  { name: 'stop', desc: 'Stop and clear the queue' },
  { name: 'pause', desc: 'Pause playback' },
  { name: 'resume', desc: 'Resume playback' },
  { name: 'nowplaying', desc: 'Show currently playing song' },
  { name: 'queue [page]', desc: 'Show the queue' },
  { name: 'remove <pos>', desc: 'Remove a song from the queue' },
  { name: 'clear', desc: 'Clear upcoming songs' },
  { name: 'loop <none|track|queue>', desc: 'Set loop mode' },
  { name: 'shuffle', desc: 'Shuffle upcoming songs' },
  { name: 'volume [0-100]', desc: 'Get or set volume' },
  { name: 'bassboost <off|low|medium|high|max>', desc: 'Bass boost control' },
  { name: 'filter <name>', desc: 'Apply an audio filter' },
  { name: 'clearfilters', desc: 'Remove all active filters' },
];

function buildEmbed(prefix) {
  const fields = COMMANDS.map(c => ({
    name: `\`${prefix}${c.name}\``,
    value: c.desc,
    inline: false,
  }));

  return new EmbedBuilder()
    .setColor('#7289DA')
    .setTitle('🎵 Music Bot — Commands')
    .addFields(fields)
    .setFooter({ text: 'Slash commands (/play, /skip…) are also available!' })
    .setTimestamp();
}

module.exports = {
  name: 'help',
  description: 'Show all bot commands',
  aliases: ['h', 'commands'],
  category: 'utility',
  cooldown: 5,

  data: new SlashCommandBuilder().setName('help').setDescription('Show all bot commands'),

  async execute(message, _args, _client) {
    const prefix = process.env.PREFIX ?? '!';
    await message.reply({ embeds: [buildEmbed(prefix)] });
  },

  async slashExecute(interaction, _client) {
    await interaction.reply({ embeds: [buildEmbed('/')], ephemeral: true });
  },
};

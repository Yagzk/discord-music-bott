const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getStats, getTopSongs, getTopUsers, getUserStats } = require('../../utils/stats');
const { withBrandFooter } = require('../../utils/embeds');

module.exports = {
  name: 'stats',
  description: 'Show music stats for this server',
  aliases: ['istatistik', 'top'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show music stats for this server')
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Stats type')
        .addChoices(
          { name: 'Overview', value: 'overview' },
          { name: 'Top Songs', value: 'songs' },
          { name: 'Top Users', value: 'users' },
          { name: 'Me', value: 'me' },
        ),
    ),

  async execute(message, args) {
    const type = normalizeType(args[0]);
    await message.reply({ embeds: [createStatsEmbed(message.guild.id, type, message.author)] });
  },

  async slashExecute(interaction) {
    const type = interaction.options.getString('type') ?? 'overview';
    await interaction.reply({ embeds: [createStatsEmbed(interaction.guild.id, type, interaction.user)] });
  },
};

function createStatsEmbed(guildId, type, user) {
  if (type === 'songs') return createTopSongsEmbed(guildId);
  if (type === 'users') return createTopUsersEmbed(guildId);
  if (type === 'me') return createUserStatsEmbed(guildId, user);
  return createOverviewEmbed(guildId, user);
}

function createOverviewEmbed(guildId, user) {
  const stats = getStats(guildId);
  const topSong = getTopSongs(guildId, 1)[0];
  const topUser = getTopUsers(guildId, 1)[0];
  const userStats = getUserStats(guildId, user.id);

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#10B981')
      .setAuthor({ name: 'Music Analytics' })
      .setTitle('Server Music Stats')
      .setDescription('A quick look at what this server has been playing.')
      .addFields(
        { name: 'Total Plays', value: `${stats.totalPlays}`, inline: true },
        { name: 'Unique Songs', value: `${Object.keys(stats.songs).length}`, inline: true },
        { name: 'Active Listeners', value: `${Object.keys(stats.users).length}`, inline: true },
        { name: 'Your Plays', value: `${userStats.plays}`, inline: true },
        { name: 'Top Song', value: topSong ? `[${topSong.title}](${topSong.url}) (${topSong.plays})` : 'None yet', inline: false },
        { name: 'Top User', value: topUser ? `<@${topUser.id}> (${topUser.plays})` : 'None yet', inline: false },
      )
      .setTimestamp(),
  );
}

function createTopSongsEmbed(guildId) {
  const songs = getTopSongs(guildId, 10);
  const description = songs.length
    ? songs.map((song, index) => `**${index + 1}.** [${song.title}](${song.url}) • **${song.plays}** plays`).join('\n')
    : 'No song stats yet.';

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#F97316')
      .setAuthor({ name: 'Music Analytics' })
      .setTitle('Top Songs')
      .setDescription(description)
      .setTimestamp(),
  );
}

function createTopUsersEmbed(guildId) {
  const users = getTopUsers(guildId, 10);
  const description = users.length
    ? users.map((entry, index) => `**${index + 1}.** <@${entry.id}> • **${entry.plays}** plays`).join('\n')
    : 'No user stats yet.';

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#A78BFA')
      .setAuthor({ name: 'Music Analytics' })
      .setTitle('Top Users')
      .setDescription(description)
      .setTimestamp(),
  );
}

function createUserStatsEmbed(guildId, user) {
  const stats = getUserStats(guildId, user.id);

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#38BDF8')
      .setAuthor({ name: `${user.username}'s Music Stats` })
      .setTitle('Personal Stats')
      .setDescription(`You requested **${stats.plays}** song(s) in this server.`)
      .setTimestamp(),
  );
}

function normalizeType(input = 'overview') {
  const type = input.toLowerCase();
  if (['song', 'songs', 'sarki', 'şarkı'].includes(type)) return 'songs';
  if (['user', 'users', 'listener', 'listeners'].includes(type)) return 'users';
  if (['me', 'ben'].includes(type)) return 'me';
  return 'overview';
}

Object.assign(module.exports, {
  createStatsEmbed,
});

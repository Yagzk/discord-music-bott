const { EmbedBuilder } = require('discord.js');

const EMBED_FOOTER_TEXT = 'made by yagiz ❤️';
const COLORS = {
  music: '#7C3AED',
  info: '#38BDF8',
  success: '#22C55E',
  error: '#EF4444',
};

function withBrandFooter(embed, text = '') {
  const footer = text ? `${text} • ${EMBED_FOOTER_TEXT}` : EMBED_FOOTER_TEXT;
  return embed.setFooter({ text: footer });
}

function createNowPlayingEmbed(song, player) {
  const loopLabel =
    player.loopMode === 'none' ? 'Off'
    : player.loopMode === 'track' ? 'Track'
    : 'Queue';

  const filterList = Object.keys(player.activeFilters);
  const upcomingCount = player.queue.getAllUpcoming().length;

  return withBrandFooter(
    new EmbedBuilder()
      .setColor(COLORS.music)
      .setAuthor({ name: 'Yagiz Music Control Room' })
      .setTitle('Now Playing')
      .setDescription(
        `### [${song.title}](${song.url})\n`
        + `Requested by ${song.requestedBy}\n\n`
        + `Use the controls below to manage playback, bass, volume, loop and filters.`,
      )
      .setThumbnail(song.thumbnail || null)
      .addFields(
        { name: 'Duration', value: song.duration || 'Live', inline: true },
        { name: 'Volume', value: `${player.volume}%`, inline: true },
        { name: 'Loop', value: loopLabel, inline: true },
        { name: 'Channel', value: song.channel || 'Unknown', inline: true },
        { name: 'Filters', value: filterList.length ? filterList.join(', ') : 'None', inline: true },
        { name: 'Up Next', value: `${upcomingCount} song(s)`, inline: true },
      )
      .setTimestamp(),
    `${upcomingCount} song(s) in queue`,
  );
}

function createQueueEmbed(songs, currentSong, page = 1) {
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(songs.length / perPage));
  const pageIndex = Math.max(1, Math.min(page, totalPages));
  const start = (pageIndex - 1) * perPage;
  const slice = songs.slice(start, start + perPage);

  const list = slice.length
    ? slice
        .map((s, i) => `**${start + i + 1}.** [${s.title}](${s.url}) \`${s.duration}\` • ${s.requestedBy}`)
        .join('\n')
    : 'No upcoming songs.';

  const nowDesc = currentSong
    ? `**Now:** [${currentSong.title}](${currentSong.url}) \`${currentSong.duration}\`\n\n`
    : '';

  return withBrandFooter(
    new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: 'Playlist Deck' })
      .setTitle('Queue')
      .setDescription(nowDesc + list)
      .setTimestamp(),
    `Page ${pageIndex}/${totalPages} • ${songs.length} upcoming`,
  );
}

function createErrorEmbed(msg) {
  return withBrandFooter(
    new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: 'System Alert' })
      .setTitle('Something needs attention')
      .setDescription(msg)
      .setTimestamp(),
  );
}

function createSuccessEmbed(msg) {
  return withBrandFooter(
    new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: 'Action Complete' })
      .setTitle('Done')
      .setDescription(msg)
      .setTimestamp(),
  );
}

function createInfoEmbed(title, msg) {
  return withBrandFooter(
    new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: 'Music Console' })
      .setTitle(title)
      .setDescription(msg)
      .setTimestamp(),
  );
}

module.exports = {
  EMBED_FOOTER_TEXT,
  createNowPlayingEmbed,
  createQueueEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createInfoEmbed,
  withBrandFooter,
};

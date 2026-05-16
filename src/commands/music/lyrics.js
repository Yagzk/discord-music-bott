const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const https = require('https');
const { createErrorEmbed, withBrandFooter } = require('../../utils/embeds');

const LRCLIB_SEARCH_URL = 'https://lrclib.net/api/search';
const MAX_DESCRIPTION_LENGTH = 3200;
const LYRICS_SESSION_TTL_MS = 15 * 60 * 1000;

module.exports = {
  name: 'lyrics',
  description: 'Find lyrics for the current or requested song',
  aliases: ['ly', 'sarki-sozu', 'söz'],
  category: 'music',
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Find lyrics for the current or requested song')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Song name').setRequired(false),
    ),

  async execute(message, args, client) {
    const query = getQuery(args.join(' '), client.musicPlayers.get(message.guild.id));
    if (!query) {
      return message.reply({ embeds: [createErrorEmbed('Provide a song name or play something first.')] });
    }

    const loading = await message.reply('Searching lyrics...');
    const result = await findLyrics(query);

    if (result.error) {
      return loading.edit({ content: null, embeds: [createErrorEmbed(result.error)] });
    }

    await loading.edit({ content: null, ...createLyricsPayload(client, message.author.id, result) });
  },

  async slashExecute(interaction, client) {
    const query = getQuery(
      interaction.options.getString('query') ?? '',
      client.musicPlayers.get(interaction.guild.id),
    );

    if (!query) {
      return interaction.reply({
        embeds: [createErrorEmbed('Provide a song name or play something first.')],
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    const result = await findLyrics(query);

    if (result.error) {
      return interaction.editReply({ embeds: [createErrorEmbed(result.error)] });
    }

    await interaction.editReply(createLyricsPayload(client, interaction.user.id, result));
  },
};

function getQuery(input, player) {
  const query = input.trim();
  if (query) return cleanSongTitle(query);

  const currentSong = player?.queue.currentSong;
  if (!player?.isPlaying || !currentSong) return null;

  return cleanSongTitle(`${currentSong.title} ${currentSong.channel ?? ''}`);
}

function cleanSongTitle(title) {
  return title
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(official|music|video|audio|lyrics?|lyric|visualizer|remastered|hd|hq|4k)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findLyrics(query) {
  const url = `${LRCLIB_SEARCH_URL}?q=${encodeURIComponent(query)}`;
  const results = await requestJson(url);

  if (results.error) {
    return results;
  }

  if (!Array.isArray(results) || results.length === 0) {
    return { error: `No lyrics found for **${query}**.` };
  }

  const match = results.find(item => item.plainLyrics || item.syncedLyrics);
  if (!match) {
    return { error: `No readable lyrics found for **${query}**.` };
  }

  const lyrics = stripSyncedTimestamps(match.plainLyrics || match.syncedLyrics || '').trim();
  if (!lyrics) {
    return { error: `No readable lyrics found for **${query}**.` };
  }

  return {
    title: match.trackName || match.name || query,
    artist: match.artistName || 'Unknown artist',
    album: match.albumName || null,
    lyrics,
  };
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'discord-music-bot/1.0.0',
        },
      },
      res => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Lyrics API returned ${res.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Lyrics API returned invalid JSON'));
          }
        });
      },
    );

    req.setTimeout(10_000, () => req.destroy(new Error('Lyrics API timed out')));
    req.on('error', reject);
  }).catch(() => ({ error: 'Lyrics service is unavailable right now.' }));
}

function stripSyncedTimestamps(lyrics) {
  return lyrics.replace(/^\[\d{2}:\d{2}(?:\.\d{2,3})?]\s*/gm, '');
}

function createLyricsEmbed(result) {
  const pages = splitLyricsIntoPages(result.lyrics);
  return createLyricsPageEmbed(result, pages[0], 0, pages.length);
}

function createLyricsPayload(client, userId, result) {
  cleanupLyricsSessions(client);

  const pages = splitLyricsIntoPages(result.lyrics);
  const sessionId = createLyricsSession(client, userId, result, pages);
  const session = client.lyricsSessions.get(sessionId);

  return createLyricsPagePayload(session);
}

function createLyricsSession(client, userId, result, pages) {
  if (!client.lyricsSessions) client.lyricsSessions = new Map();

  const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  client.lyricsSessions.set(sessionId, {
    id: sessionId,
    userId,
    result,
    pages,
    page: 0,
    createdAt: Date.now(),
  });

  return sessionId;
}

function createLyricsPagePayload(session) {
  return {
    embeds: [
      createLyricsPageEmbed(session.result, session.pages[session.page], session.page, session.pages.length),
    ],
    components: session.pages.length > 1 ? [createLyricsPageRow(session)] : [],
  };
}

function createLyricsPageEmbed(result, pageText, pageIndex, totalPages) {
  const pageLabel = totalPages > 1 ? `Page ${pageIndex + 1}/${totalPages}` : '';

  const embed = new EmbedBuilder()
    .setColor('#38BDF8')
    .setAuthor({ name: 'Lyrics Archive' })
    .setTitle(`Lyrics: ${result.title}`)
    .setDescription(pageText)
    .addFields({ name: 'Artist', value: result.artist, inline: true })
    .setTimestamp();

  if (result.album) {
    embed.addFields({ name: 'Album', value: result.album, inline: true });
  }

  return withBrandFooter(embed, pageLabel);
}

function createLyricsPageRow(session) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lyrics:prev:${session.id}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.page === 0),
    new ButtonBuilder()
      .setCustomId(`lyrics:next:${session.id}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(session.page >= session.pages.length - 1),
  );
}

function splitLyricsIntoPages(lyrics) {
  const lines = lyrics.split('\n');
  const pages = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > MAX_DESCRIPTION_LENGTH && current) {
      pages.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) pages.push(current);
  return pages.length ? pages : ['No readable lyrics found.'];
}

function cleanupLyricsSessions(client) {
  if (!client.lyricsSessions) return;
  const expiresBefore = Date.now() - LYRICS_SESSION_TTL_MS;

  for (const [id, session] of client.lyricsSessions) {
    if (session.createdAt < expiresBefore) client.lyricsSessions.delete(id);
  }
}

Object.assign(module.exports, {
  cleanSongTitle,
  createLyricsEmbed,
  createLyricsPagePayload,
  createLyricsPayload,
  findLyrics,
});

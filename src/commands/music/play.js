const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { spawn } = require('child_process');
const play = require('play-dl');
const { MusicPlayer } = require('../../player/MusicPlayer');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { searchTrack: searchSpotify } = require('../../utils/spotifySearch');

// Format seconds → H:MM:SS or M:SS
function fmtDuration(sec) {
  if (!sec) return 'Live';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function fetchPlaylistWithYtDlp(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--flat-playlist', '--no-warnings', '-J', url]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Failed to parse yt-dlp playlist output')); }
    });
  });
}

async function refreshPlayDlSpotifyToken() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return;
  await play.setToken({
    spotify: {
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
      market: 'TR',
    },
  });
}

async function fetchSpotify(url) {
  try {
    return await play.spotify(url);
  } catch (err) {
    if (err.message?.includes('401')) {
      await refreshPlayDlSpotifyToken();
      return play.spotify(url);
    }
    throw err;
  }
}

async function handleSpotify(spType, url, voiceChannel, textChannel, requestedBy, guild, client) {
  if (spType === 'artist') {
    return { error: 'Spotify sanatçı sayfaları desteklenmiyor. Şarkı, albüm veya playlist linki girin.' };
  }

  const songs = [];
  let collectionName = null;

  try {
    const sp = await fetchSpotify(url);

    if (spType === 'track') {
      const artistStr = sp.artists.map(a => a.name).join(', ');
      songs.push({
        title: `${sp.name} — ${artistStr}`,
        url: `ytsearch1:${sp.name} ${artistStr}`,
        duration: fmtDuration(Math.floor(sp.durationInMs / 1000)),
        thumbnail: sp.thumbnail?.url ?? null,
        channel: artistStr,
        requestedBy,
      });
    } else {
      collectionName = sp.name;
      for (let page = 1; page <= sp.total_pages; page++) {
        const tracks = await sp.page(page);
        for (const track of tracks) {
          const artistStr = track.artists.map(a => a.name).join(', ');
          songs.push({
            title: `${track.name} — ${artistStr}`,
            url: `ytsearch1:${track.name} ${artistStr}`,
            duration: fmtDuration(Math.floor(track.durationInMs / 1000)),
            thumbnail: track.thumbnail?.url ?? null,
            channel: artistStr,
            requestedBy,
          });
        }
      }
    }
  } catch (err) {
    logger.error('Spotify fetch error:', err);
    return { error: `Spotify'den bilgi alınamadı: ${err.message}` };
  }

  if (!songs.length) {
    return { error: 'Spotify içeriğinden şarkı alınamadı.' };
  }

  let player = client.musicPlayers.get(guild.id);
  if (!player) {
    player = new MusicPlayer(guild.id, client);
    client.musicPlayers.set(guild.id, player);
  }
  player.textChannel = textChannel;
  player.connect(voiceChannel);

  if (songs.length === 1) {
    const wasPlaying = player.isPlaying;
    await player.addToQueue(songs[0]);
    return { song: songs[0], wasPlaying };
  }

  await player.addManyToQueue(songs);
  return {
    playlist: {
      title: collectionName ?? 'Spotify Playlist',
      added: songs.length,
      total: songs.length,
    },
  };
}


async function resolveTextSearch(query, requestedBy) {
  // 1. Spotify
  try {
    const sp = await searchSpotify(query);
    if (sp) {
      return {
        title: sp.title,
        url: sp.url,
        duration: fmtDuration(Math.floor(sp.durationMs / 1000)),
        thumbnail: sp.thumbnail,
        channel: sp.artistStr,
        requestedBy,
      };
    }
  } catch {}

  // 2. YouTube
  try {
    const results = await play.search(query, { limit: 1 });
    if (results?.length) {
      const v = results[0];
      return {
        title: v.title,
        url: v.url,
        duration: fmtDuration(v.durationInSec),
        thumbnail: v.thumbnails?.[0]?.url ?? null,
        channel: v.channel?.name ?? 'Unknown',
        requestedBy,
      };
    }
  } catch {}

  return null;
}

// Shared logic used by both prefix and slash execute functions
async function handlePlay(query, voiceChannel, textChannel, requestedBy, guild, client, statusMessage = null) {
  // Check bot voice permissions
  const perms = voiceChannel.permissionsFor(guild.members.me);
  if (!perms?.has(PermissionsBitField.Flags.Connect) || !perms?.has(PermissionsBitField.Flags.Speak)) {
    return { error: "I don't have permission to join or speak in your voice channel." };
  }

  // ── Spotify ───────────────────────────────────────────────────────────────────
  const spType = play.sp_validate(query);
  if (spType && spType !== 'search') {
    return handleSpotify(spType, query, voiceChannel, textChannel, requestedBy, guild, client);
  }

  const validated = play.yt_validate(query);

  // ── Playlist ─────────────────────────────────────────────────────────────────
  if (validated === 'playlist') {
    let playlistData;
    try {
      playlistData = await fetchPlaylistWithYtDlp(query);
    } catch (err) {
      logger.error('Playlist fetch error:', err);
      return { error: `Could not fetch playlist: ${err.message}` };
    }

    const entries = playlistData?.entries ?? [];
    if (!entries.length) {
      return { error: 'The playlist is empty or could not be loaded.' };
    }

    const MAX_PLAYLIST = 200;
    const videos = entries.slice(0, MAX_PLAYLIST);
    const songs = videos.map(v => ({
      title: v.title ?? v.id ?? 'Unknown',
      url: v.url?.startsWith('http') ? v.url : `https://www.youtube.com/watch?v=${v.id}`,
      duration: v.duration ? fmtDuration(v.duration) : 'Unknown',
      thumbnail: v.thumbnails?.[0]?.url ?? null,
      channel: v.channel ?? v.uploader ?? 'Unknown',
      requestedBy,
    }));

    let player = client.musicPlayers.get(guild.id);
    if (!player) {
      player = new MusicPlayer(guild.id, client);
      client.musicPlayers.set(guild.id, player);
    }
    player.textChannel = textChannel;
    player.connect(voiceChannel);

    await player.addManyToQueue(songs);

    return {
      playlist: {
        title: playlistData.title ?? 'Unknown Playlist',
        added: songs.length,
        total: entries.length,
      },
    };
  }

  // ── Single video or search ────────────────────────────────────────────────────
  let song;
  try {
    if (validated === 'video') {
      const info = await play.video_info(query);
      const v = info.video_details;
      song = {
        title: v.title,
        url: v.url,
        duration: fmtDuration(v.durationInSec),
        thumbnail: v.thumbnails?.[0]?.url ?? null,
        channel: v.channel?.name ?? 'Unknown',
        requestedBy,
      };
    } else {
      song = await resolveTextSearch(query, requestedBy);
      if (!song) return { error: 'Hiçbir platformda sonuç bulunamadı.' };
    }
  } catch (err) {
    logger.error('play-dl error:', err);
    return { error: `Could not fetch video info: ${err.message}` };
  }

  // Get or create player for this guild
  let player = client.musicPlayers.get(guild.id);
  if (!player) {
    player = new MusicPlayer(guild.id, client);
    client.musicPlayers.set(guild.id, player);
  }
  player.textChannel = textChannel;
  player.connect(voiceChannel);

  const wasPlaying = player.isPlaying;
  if (!wasPlaying && statusMessage) {
    player.nowPlayingMessage = statusMessage;
  }

  await player.addToQueue(song);

  return { song, wasPlaying };
}

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube (URL or search query)',
  aliases: ['p'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Song name or YouTube URL').setRequired(true).setAutocomplete(true),
    ),

  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({ embeds: [createErrorEmbed('Provide a song name or URL: `!play <query>`')] });
    }
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply({ embeds: [createErrorEmbed('You must be in a voice channel!')] });
    }

    const loading = await message.reply('🔍 Searching…');
    const result = await handlePlay(
      args.join(' '),
      voiceChannel,
      message.channel,
      message.author,
      message.guild,
      client,
      loading,
    );

    if (result.error) {
      return loading.edit({ content: null, embeds: [createErrorEmbed(result.error)] });
    }

    if (result.playlist) {
      const { title, added, total } = result.playlist;
      const note = added < total ? ` (showing first ${added} of ${total})` : '';
      return loading.edit({ content: null, embeds: [createSuccessEmbed(`Added **${added} songs** from **${title}**${note} to the queue!`)] });
    }

    if (result.wasPlaying) {
      await loading.edit({ content: null, embeds: [createSuccessEmbed(`Added to queue: **${result.song.title}**`)] });
    }
  },

  async slashExecute(interaction, client) {
    await interaction.deferReply();
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply({ embeds: [createErrorEmbed('You must be in a voice channel!')] });
    }

    const query = interaction.options.getString('query');
    const statusMessage = await interaction.fetchReply().catch(() => null);
    const result = await handlePlay(
      query,
      voiceChannel,
      interaction.channel,
      interaction.user,
      interaction.guild,
      client,
      statusMessage,
    );

    if (result.error) {
      return interaction.editReply({ embeds: [createErrorEmbed(result.error)] });
    }

    if (result.playlist) {
      const { title, added, total } = result.playlist;
      const note = added < total ? ` (showing first ${added} of ${total})` : '';
      return interaction.editReply({ embeds: [createSuccessEmbed(`Added **${added} songs** from **${title}**${note} to the queue!`)] });
    }

    if (result.wasPlaying) {
      await interaction.editReply({ embeds: [createSuccessEmbed(`Added to queue: **${result.song.title}**`)] });
    }
  },

  async autocomplete(interaction) {
    const query = interaction.options.getFocused();
    if (!query || query.length < 2) return interaction.respond([]);
    try {
      const results = await play.search(query, { limit: 5 });
      await interaction.respond(
        results.map(v => ({ name: (v.title ?? 'Unknown').substring(0, 100), value: v.url })),
      );
    } catch {
      await interaction.respond([]);
    }
  },
};

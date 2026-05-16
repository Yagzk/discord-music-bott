const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const { ActivityType } = require('discord.js');
const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static');
const { Queue, LOOP_MODES } = require('./Queue');
const { buildFilterString } = require('./AudioFilters');
const { createNowPlayingEmbed, createSuccessEmbed } = require('../utils/embeds');
const { createMusicControlRows } = require('../utils/musicControls');
const { addToHistory } = require('../utils/history');
const { recordPlay } = require('../utils/stats');
const logger = require('../utils/logger');

class MusicPlayer {
  constructor(guildId, client = null) {
    this.guildId = guildId;
    this.client = client;
    this.queue = new Queue();
    this.audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    this.voiceConnection = null;
    this.currentResource = null;
    this.textChannel = null;
    this.volume = 50;        // 0–100
    this.activeFilters = {}; // key → ffmpeg filter string
    this._isPlaying = false;
    this._transitioning = false; // prevents Idle handler from double-advancing on skip
    this._ffmpegProcess = null;
    this._ytdlpProcess = null;
    this._resourceStartOffsetMs = 0;
    this.nowPlayingMessage = null;
    this._failedStreamUrl = null;

    this._setupPlayerListeners();
  }

  get loopMode() { return this.queue.loopMode; }
  get isPlaying() { return this._isPlaying; }

  // ─── Voice connection ────────────────────────────────────────────────────────

  connect(voiceChannel) {
    // Already connected to the same channel → nothing to do
    if (
      this.voiceConnection &&
      this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed &&
      this.voiceConnection.joinConfig.channelId === voiceChannel.id
    ) return;

    if (this.voiceConnection) {
      this.voiceConnection.removeAllListeners();
      this.voiceConnection.destroy();
    }

    this.voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.voiceConnection.subscribe(this.audioPlayer);
    this._setupConnectionListeners();
  }

  disconnect() {
    this._cleanupPlayback();
    this.audioPlayer.stop(true);
    if (this.voiceConnection) {
      this.voiceConnection.destroy();
      this.voiceConnection = null;
    }
  }

  // ─── Playback controls ───────────────────────────────────────────────────────

  async addToQueue(song) {
    this.queue.add(song);
    if (!this._isPlaying) {
      await this._playSong(this.queue.currentSong);
    }
  }

  async addManyToQueue(songs) {
    const shouldStart = !this._isPlaying;
    for (const song of songs) {
      this.queue.add(song);
    }
    if (shouldStart) {
      await this._playSong(this.queue.currentSong);
    }
  }

  async skip() {
    if (!this._isPlaying) return false;
    this._transitioning = true;
    const next = this.queue.advance();
    if (!next) {
      this._transitioning = false;
      this.stop();
      return false;
    }
    await this._playSong(next);
    this._transitioning = false;
    return true;
  }

  stop() {
    this._cleanupPlayback();
    this.audioPlayer.stop(true);
  }

  pause() {
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) return false;
    this.audioPlayer.pause();
    return true;
  }

  resume() {
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Paused) return false;
    this.audioPlayer.unpause();
    return true;
  }

  // ─── Volume & filters ────────────────────────────────────────────────────────

  setVolume(vol) {
    this.volume = Math.max(0, vol);
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume / 100);
    }
  }

  async applyFilter(key, filterString) {
    this.activeFilters[key] = filterString;
    await this._restartCurrentSong(true);
  }

  async removeFilter(key) {
    delete this.activeFilters[key];
    await this._restartCurrentSong(true);
  }

  async clearFilters() {
    this.activeFilters = {};
    await this._restartCurrentSong(true);
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  async seek(seconds) {
    if (!this._isPlaying || !this.queue.currentSong) return false;
    this._transitioning = true;
    await this._playSong(this.queue.currentSong, true, Math.max(0, seconds));
    this._transitioning = false;
    return true;
  }

  async _restartCurrentSong(silent = false) {
    if (!this._isPlaying || !this.queue.currentSong) return;
    this._transitioning = true;
    const seekSeconds = this._getPlaybackPositionMs() / 1000;
    await this._playSong(this.queue.currentSong, silent, seekSeconds);
    this._transitioning = false;
  }

  async _playSong(song, silent = false, seekSeconds = 0) {
    this._stopFFmpeg();
    this._isPlaying = true;

    try {
      const filterStr = buildFilterString(this.activeFilters);
      const { readable, type } = await this._createStream(song.url, filterStr, seekSeconds);

      const resource = createAudioResource(readable, { inputType: type, inlineVolume: true });
      resource.volume.setVolume(this.volume / 100);
      this.currentResource = resource;
      this._resourceStartOffsetMs = Math.max(0, Math.floor(seekSeconds * 1000));

      this.audioPlayer.play(resource);
      this._setNowPlayingActivity(song);

      if (!silent) {
        addToHistory(this.guildId, song);
        recordPlay(this.guildId, song);
      }

      if (!silent && this.textChannel) {
        this._sendOrUpdateNowPlayingMessage(song).catch(() => {});
      }
    } catch (err) {
      logger.error(`Failed to play "${song.title}":`, err);
      this._isPlaying = false;

      setTimeout(async () => {
        const next = this.queue.advance();
        if (next) await this._playSong(next);
      }, 1500);
    }
  }

  async _createStream(url, filterStr, seekSeconds = 0) {
    const safeSeekSeconds = Math.max(0, Math.floor(seekSeconds));
    const ytdlp = spawn('yt-dlp', [
      '-f', 'bestaudio',
      '--no-playlist',
      '--extractor-retries', '3',
      '--retry-sleep', 'exp=1:5',
      '-o', '-',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    this._ytdlpProcess = ytdlp;

    const stderrChunks = [];
    ytdlp.stderr.on('data', chunk => stderrChunks.push(chunk));
    ytdlp.on('close', code => {
      if (code && code !== 0) {
        logger.warn(`yt-dlp çıkış kodu ${code}: ${Buffer.concat(stderrChunks).toString().slice(-400)}`);
      }
    });

    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      ...(safeSeekSeconds > 0 ? ['-ss', String(safeSeekSeconds)] : []),
      '-loglevel', '0',
      '-vn',
      '-ar', '48000',
      '-ac', '2',
      ...(filterStr ? ['-af', filterStr] : []),
      '-c:a', 'libopus',
      '-b:a', '192k',
      '-application', 'audio',
      '-f', 'ogg',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });
    this._ffmpegProcess = ffmpeg;

    ytdlp.stdout.pipe(ffmpeg.stdin).on('error', () => {});
    ffmpeg.stdin.on('error', () => {});
    ytdlp.on('error', err => logger.error('yt-dlp error:', err));
    ffmpeg.on('error', err => logger.error('FFmpeg error:', err));

    return { readable: ffmpeg.stdout, type: StreamType.OggOpus };
  }

  _killProc(proc) {
    try { proc?.kill('SIGKILL'); } catch {}
  }

  _stopFFmpeg() {
    this._killProc(this._ytdlpProcess);
    this._ytdlpProcess = null;
    this._killProc(this._ffmpegProcess);
    this._ffmpegProcess = null;
    this.currentResource = null;
  }

  _getPlaybackPositionMs() {
    return this._resourceStartOffsetMs + (this.currentResource?.playbackDuration ?? 0);
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────

  _setupPlayerListeners() {
    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      if (!this._isPlaying || this._transitioning) return;

      const playedMs = this._getPlaybackPositionMs();
      const currentSong = this.queue.currentSong;

      // Çok kısa süre çaldıysa stream hatası — aynı şarkıyı bir kez yeniden dene
      if (playedMs < 1500 && currentSong && this._failedStreamUrl !== currentSong.url) {
        this._failedStreamUrl = currentSong.url;
        logger.warn(`Stream hatası ("${currentSong.title}", ${playedMs}ms), yeniden deneniyor...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this._playSong(currentSong);
        return;
      }

      this._failedStreamUrl = null;
      const next = this.queue.advance();
      if (next) {
        await this._playSong(next);
      } else {
        this._cleanupPlayback();
      }
    });

    this.audioPlayer.on('error', err => {
      logger.error('AudioPlayer error:', err);
      const song = this.queue.currentSong;
      if (song) this._playSong(song).catch(logger.error);
    });
  }

  _setupConnectionListeners() {
    this.voiceConnection.on('stateChange', (old, next) => logger.info(`Voice: ${old.status} → ${next.status}`));
    this.voiceConnection.on('error', err => logger.error('Voice error:', err));

    this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Give Discord 5 seconds to reconnect on its own before giving up
        await Promise.race([
          entersState(this.voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (this.voiceConnection?.state.status !== VoiceConnectionStatus.Destroyed) {
          this.voiceConnection.destroy();
          this.voiceConnection = null;
          this._cleanupPlayback();
          this.client?.musicPlayers?.delete(this.guildId);
        }
      }
    });

    this.voiceConnection.on(VoiceConnectionStatus.Destroyed, () => {
      this._cleanupPlayback();
      this.client?.musicPlayers?.delete(this.guildId);
    });
  }

  _cleanupPlayback() {
    this._stopFFmpeg();
    this.queue.clearAll();
    this._isPlaying = false;
    this._markNowPlayingStopped();
    this._refreshBotActivity();
  }

  async _sendOrUpdateNowPlayingMessage(song) {
    const payload = {
      embeds: [createNowPlayingEmbed(song, this)],
      components: createMusicControlRows(this),
    };

    if (this.nowPlayingMessage) {
      try {
        this.nowPlayingMessage = await this.nowPlayingMessage.edit(payload);
        return;
      } catch {
        this.nowPlayingMessage = null;
      }
    }

    this.nowPlayingMessage = await this.textChannel.send(payload);
  }

  _markNowPlayingStopped() {
    if (!this.nowPlayingMessage) return;

    this.nowPlayingMessage
      .edit({
        embeds: [createSuccessEmbed('Playback stopped and the playlist was cleared.')],
        components: [],
      })
      .catch(() => {})
      .finally(() => {
        this.nowPlayingMessage = null;
      });
  }

  _setNowPlayingActivity(song) {
    try {
      this.client?.user?.setActivity(song.title, { type: ActivityType.Listening });
    } catch {}
  }

  _refreshBotActivity() {
    const otherPlayer = [...(this.client?.musicPlayers?.values() ?? [])]
      .find(player => player !== this && player.isPlaying && player.queue.currentSong);

    if (otherPlayer) {
      this._setNowPlayingActivity(otherPlayer.queue.currentSong);
      return;
    }

    try {
      this.client?.user?.setActivity(`Music | ${process.env.PREFIX ?? '!'}help`, {
        type: ActivityType.Listening,
      });
    } catch {}
  }
}

module.exports = { MusicPlayer, LOOP_MODES };

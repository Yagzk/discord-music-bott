const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const STATS_PATH = join(__dirname, '../../data/stats.json');

function readStore() {
  ensureStore();

  try {
    return JSON.parse(readFileSync(STATS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  writeFileSync(STATS_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function ensureStore() {
  const dir = dirname(STATS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(STATS_PATH)) writeFileSync(STATS_PATH, '{}\n', 'utf8');
}

function getGuildStats(store, guildId) {
  if (!store[guildId]) {
    store[guildId] = {
      totalPlays: 0,
      users: {},
      songs: {},
    };
  }

  return store[guildId];
}

function recordPlay(guildId, song) {
  const store = readStore();
  const guildStats = getGuildStats(store, guildId);
  const userId = song.requestedBy?.id ?? 'unknown';
  const userName = song.requestedBy?.username ?? String(song.requestedBy ?? 'Unknown');

  guildStats.totalPlays += 1;

  if (!guildStats.users[userId]) {
    guildStats.users[userId] = { id: userId, name: userName, plays: 0 };
  }
  guildStats.users[userId].name = userName;
  guildStats.users[userId].plays += 1;

  if (!guildStats.songs[song.url]) {
    guildStats.songs[song.url] = {
      title: song.title,
      url: song.url,
      channel: song.channel ?? 'Unknown',
      duration: song.duration,
      plays: 0,
    };
  }
  guildStats.songs[song.url].title = song.title;
  guildStats.songs[song.url].plays += 1;

  writeStore(store);
  return guildStats;
}

function getStats(guildId) {
  const store = readStore();
  return getGuildStats(store, guildId);
}

function getUserStats(guildId, userId) {
  const stats = getStats(guildId);
  return stats.users[userId] ?? { id: userId, name: 'Unknown', plays: 0 };
}

function getTopUsers(guildId, limit = 10) {
  const stats = getStats(guildId);
  return Object.values(stats.users)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

function getTopSongs(guildId, limit = 10) {
  const stats = getStats(guildId);
  return Object.values(stats.songs)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

module.exports = {
  getStats,
  getTopSongs,
  getTopUsers,
  getUserStats,
  recordPlay,
};

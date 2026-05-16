const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const HISTORY_PATH = join(__dirname, '../../data/history.json');
const MAX_HISTORY_ITEMS = 50;

function readStore() {
  ensureStore();

  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  writeFileSync(HISTORY_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function ensureStore() {
  const dir = dirname(HISTORY_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(HISTORY_PATH)) writeFileSync(HISTORY_PATH, '{}\n', 'utf8');
}

function addToHistory(guildId, song) {
  const store = readStore();
  const history = store[guildId] ?? [];

  if (history[0]?.url === song.url) return history;

  history.unshift({
    title: song.title,
    url: song.url,
    duration: song.duration,
    thumbnail: song.thumbnail ?? null,
    channel: song.channel ?? 'Unknown',
    requestedBy: song.requestedBy?.id ?? null,
    requestedByName: song.requestedBy?.username ?? String(song.requestedBy ?? 'Unknown'),
    playedAt: new Date().toISOString(),
  });

  store[guildId] = history.slice(0, MAX_HISTORY_ITEMS);
  writeStore(store);
  return store[guildId];
}

function getHistory(guildId) {
  const store = readStore();
  return store[guildId] ?? [];
}

function clearHistory(guildId) {
  const store = readStore();
  const count = store[guildId]?.length ?? 0;
  store[guildId] = [];
  writeStore(store);
  return count;
}

module.exports = {
  addToHistory,
  clearHistory,
  getHistory,
};

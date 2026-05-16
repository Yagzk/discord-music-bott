const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const FAVORITES_PATH = join(__dirname, '../../data/favorites.json');

function readStore() {
  ensureStore();

  try {
    return JSON.parse(readFileSync(FAVORITES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  writeFileSync(FAVORITES_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function ensureStore() {
  const dir = dirname(FAVORITES_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(FAVORITES_PATH)) writeFileSync(FAVORITES_PATH, '{}\n', 'utf8');
}

function getFavorites(userId) {
  const store = readStore();
  return store[userId] ?? [];
}

function addFavorite(userId, song) {
  const store = readStore();
  const favorites = store[userId] ?? [];

  if (favorites.some(fav => fav.url === song.url)) {
    return { added: false, favorites };
  }

  const favorite = {
    title: song.title,
    url: song.url,
    duration: song.duration,
    thumbnail: song.thumbnail ?? null,
    channel: song.channel ?? 'Unknown',
    addedAt: new Date().toISOString(),
  };

  favorites.push(favorite);
  store[userId] = favorites;
  writeStore(store);

  return { added: true, favorites };
}

function removeFavorite(userId, position) {
  const store = readStore();
  const favorites = store[userId] ?? [];
  const index = position - 1;

  if (index < 0 || index >= favorites.length) {
    return null;
  }

  const [removed] = favorites.splice(index, 1);
  store[userId] = favorites;
  writeStore(store);

  return removed;
}

function clearFavorites(userId) {
  const store = readStore();
  const count = store[userId]?.length ?? 0;
  store[userId] = [];
  writeStore(store);
  return count;
}

function shuffleFavorites(favorites) {
  const shuffled = [...favorites];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  addFavorite,
  clearFavorites,
  getFavorites,
  removeFavorite,
  shuffleFavorites,
};

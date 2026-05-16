const LOOP_MODES = { NONE: 'none', TRACK: 'track', QUEUE: 'queue' };

class Queue {
  constructor() {
    this.songs = [];
    this.currentIndex = 0;
    this.loopMode = LOOP_MODES.NONE;
  }

  get size() { return this.songs.length; }
  get isEmpty() { return this.songs.length === 0; }
  get currentSong() { return this.songs[this.currentIndex] ?? null; }

  add(song) {
    this.songs.push(song);
  }

  // Insert song immediately after the current one (for "play next" behaviour)
  addNext(song) {
    this.songs.splice(this.currentIndex + 1, 0, song);
  }

  // Remove song by 1-based queue position; returns removed song or null
  remove(position) {
    const idx = position - 1;
    if (idx < 0 || idx >= this.songs.length) return null;
    const [removed] = this.songs.splice(idx, 1);
    if (idx < this.currentIndex) this.currentIndex--;
    return removed;
  }

  // Clear upcoming songs, keep current
  clearUpcoming() {
    this.songs = this.songs.slice(0, this.currentIndex + 1);
  }

  // Clear everything
  clearAll() {
    this.songs = [];
    this.currentIndex = 0;
  }

  // Move to the next song according to loop mode; returns the song to play or null
  advance() {
    if (this.loopMode === LOOP_MODES.TRACK) return this.currentSong;

    if (this.loopMode === LOOP_MODES.QUEUE) {
      this.currentIndex = (this.currentIndex + 1) % this.songs.length;
      return this.currentSong;
    }

    // NONE mode
    if (this.currentIndex < this.songs.length - 1) {
      this.currentIndex++;
      return this.currentSong;
    }
    return null;
  }

  // Shuffle all songs after the current one (Fisher-Yates)
  shuffle() {
    const rest = this.songs.splice(this.currentIndex + 1);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.songs.push(...rest);
  }

  getAllUpcoming() {
    return this.songs.slice(this.currentIndex + 1);
  }

  setLoopMode(mode) {
    if (!Object.values(LOOP_MODES).includes(mode)) return false;
    this.loopMode = mode;
    return true;
  }
}

module.exports = { Queue, LOOP_MODES };

const play = require('play-dl');
const logger = require('../utils/logger');
const { initLogChannel } = require('../utils/activityLog');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag} (${client.user.id})`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setActivity(`🎵 Music | ${process.env.PREFIX ?? '!'}help`, { type: 2 });
    initLogChannel(client);

    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      const spotifyTokenConfig = {
        spotify: {
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
          refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
          market: 'TR',
        },
      };

      const initSpotify = async () => {
        try {
          await play.setToken(spotifyTokenConfig);
          logger.info('Spotify token yenilendi');
        } catch (err) {
          logger.warn('Spotify token ayarlanamadı:', err.message);
        }
      };

      await initSpotify();
      // Spotify token'ı 60dk'da doluyor; 50dk'da bir yenile
      setInterval(initSpotify, 50 * 60 * 1000);
    }
  },
};

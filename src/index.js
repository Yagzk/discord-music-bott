require('dotenv').config();
process.env.FFMPEG_PATH = 'ffmpeg';

const sodium = require('libsodium-wrappers');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { handleCommands } = require('./handlers/commandHandler');
const { handleEvents } = require('./handlers/eventHandler');
const logger = require('./utils/logger');

sodium.ready.then(() => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.cooldowns = new Collection();
  client.commands = new Collection();
  client.slashCommands = new Collection();
  client.musicPlayers = new Map();

  handleCommands(client);
  handleEvents(client);

  client.login(process.env.BOT_TOKEN).catch(err => {
    logger.error('Failed to login:', err.message);
    process.exit(1);
  });
});

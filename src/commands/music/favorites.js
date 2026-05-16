const { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { MusicPlayer } = require('../../player/MusicPlayer');
const {
  addFavorite,
  clearFavorites,
  getFavorites,
  removeFavorite,
  shuffleFavorites,
} = require('../../utils/favorites');
const { createErrorEmbed, createSuccessEmbed, withBrandFooter } = require('../../utils/embeds');

const PLAY_MODES = { ORDER: 'order', SHUFFLE: 'shuffle' };

module.exports = {
  name: 'favorites',
  description: 'Manage your personal favorite songs',
  aliases: ['fav', 'favs', 'favorite'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('favorites')
    .setDescription('Manage your personal favorite songs')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add the current song to your favorites'),
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show your favorites'),
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a favorite by number')
        .addIntegerOption(opt =>
          opt.setName('position').setDescription('Favorite number').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear your favorites'),
    )
    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Play your favorites')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Playback order')
            .addChoices(
              { name: 'Order', value: PLAY_MODES.ORDER },
              { name: 'Shuffle', value: PLAY_MODES.SHUFFLE },
            ),
        ),
    ),

  async execute(message, args, client) {
    const action = (args[0] ?? 'list').toLowerCase();

    if (action === 'add') {
      return addCurrentSong(message, client, message.author.id, payload => message.reply(payload));
    }

    if (action === 'list') {
      return message.reply({ embeds: [createFavoritesEmbed(message.author, getFavorites(message.author.id))] });
    }

    if (action === 'remove' || action === 'delete') {
      const position = parseInt(args[1], 10);
      if (Number.isNaN(position) || position < 1) {
        return message.reply({ embeds: [createErrorEmbed('Usage: `!fav remove <number>`')] });
      }

      return removeFavoriteAt(message.author.id, position, payload => message.reply(payload));
    }

    if (action === 'clear') {
      const count = clearFavorites(message.author.id);
      return message.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** favorite song(s).`)] });
    }

    if (action === 'play') {
      const mode = normalizePlayMode(args[1]);
      return playFavorites(message, client, message.author, mode, payload => message.reply(payload));
    }

    return message.reply({
      embeds: [createErrorEmbed('Usage: `!fav <add | list | remove | clear | play> [shuffle]`')],
    });
  },

  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      return addCurrentSong(interaction, client, interaction.user.id, payload => interaction.reply(payload));
    }

    if (subcommand === 'list') {
      return interaction.reply({
        embeds: [createFavoritesEmbed(interaction.user, getFavorites(interaction.user.id))],
        ephemeral: true,
      });
    }

    if (subcommand === 'remove') {
      const position = interaction.options.getInteger('position');
      return removeFavoriteAt(interaction.user.id, position, payload => interaction.reply({ ...payload, ephemeral: true }));
    }

    if (subcommand === 'clear') {
      const count = clearFavorites(interaction.user.id);
      return interaction.reply({
        embeds: [createSuccessEmbed(`Cleared **${count}** favorite song(s).`)],
        ephemeral: true,
      });
    }

    if (subcommand === 'play') {
      const mode = interaction.options.getString('mode') ?? PLAY_MODES.ORDER;
      await interaction.deferReply();
      return playFavorites(interaction, client, interaction.user, mode, payload => interaction.editReply(payload));
    }
  },
};

async function addCurrentSong(source, client, userId, reply) {
  const player = client.musicPlayers.get(source.guild.id);
  const song = player?.queue.currentSong;

  if (!player?.isPlaying || !song) {
    return reply({ embeds: [createErrorEmbed('Nothing is playing!')] });
  }

  const result = addFavorite(userId, song);
  if (!result.added) {
    return reply({ embeds: [createErrorEmbed('This song is already in your favorites.')] });
  }

  return reply({ embeds: [createSuccessEmbed(`Added **${song.title}** to your favorites.`)] });
}

function removeFavoriteAt(userId, position, reply) {
  const removed = removeFavorite(userId, position);
  if (!removed) {
    return reply({ embeds: [createErrorEmbed('Favorite number not found.')] });
  }

  return reply({ embeds: [createSuccessEmbed(`Removed **${removed.title}** from your favorites.`)] });
}

async function playFavorites(source, client, user, mode, reply) {
  const voiceChannel = source.member?.voice?.channel;
  if (!voiceChannel) {
    return reply({ embeds: [createErrorEmbed('You must be in a voice channel!')] });
  }

  const favorites = getFavorites(user.id);
  if (favorites.length === 0) {
    return reply({ embeds: [createErrorEmbed('Your favorites list is empty.')] });
  }

  const ordered = mode === PLAY_MODES.SHUFFLE ? shuffleFavorites(favorites) : favorites;
  const playerResult = getOrCreatePlayer(client, source.guild, voiceChannel, source.channel);
  if (playerResult.error) {
    return reply({ embeds: [createErrorEmbed(playerResult.error)] });
  }

  const player = playerResult.player;
  const wasPlaying = player.isPlaying;

  for (const favorite of ordered) {
    await player.addToQueue({
      title: favorite.title,
      url: favorite.url,
      duration: favorite.duration,
      thumbnail: favorite.thumbnail,
      channel: favorite.channel,
      requestedBy: user,
    });
  }

  const modeLabel = mode === PLAY_MODES.SHUFFLE ? 'shuffled' : 'in order';
  const action = wasPlaying ? 'Added to queue' : 'Started playing';
  return reply({
    embeds: [createSuccessEmbed(`${action} **${ordered.length}** favorite song(s) ${modeLabel}.`)],
  });
}

function getOrCreatePlayer(client, guild, voiceChannel, textChannel) {
  const perms = voiceChannel.permissionsFor(guild.members.me);
  if (!perms?.has(PermissionsBitField.Flags.Connect) || !perms?.has(PermissionsBitField.Flags.Speak)) {
    return { error: "I don't have permission to join or speak in your voice channel." };
  }

  let player = client.musicPlayers.get(guild.id);
  if (!player) {
    player = new MusicPlayer(guild.id, client);
    client.musicPlayers.set(guild.id, player);
  }

  player.textChannel = textChannel;
  player.connect(voiceChannel);
  return { player };
}

function createFavoritesEmbed(user, favorites) {
  const description = favorites.length
    ? favorites
        .slice(0, 20)
        .map((song, index) => `**${index + 1}.** [${song.title}](${song.url}) \`${song.duration}\``)
        .join('\n')
    : 'No favorites yet. Use `!fav add` while a song is playing.';

  const suffix = favorites.length > 20 ? `\n\n...and ${favorites.length - 20} more.` : '';

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#F59E0B')
      .setAuthor({ name: `${user.username}'s Favorites` })
      .setTitle('Favorite Songs')
      .setDescription(description + suffix)
      .setTimestamp(),
    `${favorites.length} saved song(s)`,
  );
}

function normalizePlayMode(input = PLAY_MODES.ORDER) {
  const mode = input.toLowerCase();
  if (['shuffle', 'random', 'karisik', 'karışık'].includes(mode)) {
    return PLAY_MODES.SHUFFLE;
  }

  return PLAY_MODES.ORDER;
}

Object.assign(module.exports, {
  addCurrentSong,
  createFavoritesEmbed,
});

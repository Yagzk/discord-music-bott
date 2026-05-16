const { AudioPlayerStatus } = require('@discordjs/voice');
const { CooldownManager } = require('../utils/cooldown');
const { AUDIO_FILTERS } = require('../player/AudioFilters');
const { LOOP_MODES } = require('../player/Queue');
const { createErrorEmbed, createNowPlayingEmbed, createQueueEmbed, createSuccessEmbed } = require('../utils/embeds');
const { addFavorite } = require('../utils/favorites');
const { CONTROL_IDS, createMusicControlRows } = require('../utils/musicControls');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/activityLog');

const UNLIMITED_VOLUME_USER_ID = '228879453399285760';
const DEFAULT_MAX_VOLUME = 50;
const BASSBOOST_LEVELS = { low: 10, medium: 20, high: 30, max: 50 };

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('lyrics:')) {
        const direction = interaction.customId.split(':')[1];
        logActivity({
          type: 'Buton',
          action: `lyrics:${direction}`,
          user: interaction.user,
          guild: interaction.guild,
          channel: interaction.channel,
        }).catch(() => {});
        return handleLyricsPage(interaction, client);
      }

      if (!interaction.customId.startsWith('music:')) return;

      const logType = interaction.isButton() ? 'Buton' : 'Select Menu';
      const logAction = interaction.isStringSelectMenu()
        ? `${interaction.customId} → ${interaction.values[0]}`
        : interaction.customId;

      logActivity({
        type: logType,
        action: logAction,
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
      }).catch(() => {});

      try {
        await handleMusicComponent(interaction, client);
      } catch (err) {
        logger.error(`Music component error "${interaction.customId}":`, err);
        const payload = { embeds: [createErrorEmbed('That panel could not be updated.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    } else if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command?.slashExecute) return;

      const cooldownMsg = CooldownManager.check(client, interaction.user.id, command);
      if (cooldownMsg) {
        return interaction
          .reply({ embeds: [createErrorEmbed(cooldownMsg)], ephemeral: true })
          .catch(() => {});
      }

      logActivity({
        type: 'Slash Komut',
        action: `/${interaction.commandName}`,
        user: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
      }).catch(() => {});

      try {
        await command.slashExecute(interaction, client);
      } catch (err) {
        logger.error(`Error in slash command "${interaction.commandName}":`, err);
        const payload = { embeds: [createErrorEmbed('An error occurred running that command.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        logger.error(`Autocomplete error for "${interaction.commandName}":`, err);
      }
    }
  },
};

async function handleMusicComponent(interaction, client) {
  const player = client.musicPlayers.get(interaction.guild.id);
  const song = player?.queue.currentSong;

  if (!player?.isPlaying || !song) {
    return interaction.reply({ embeds: [createErrorEmbed('Nothing is playing!')], ephemeral: true });
  }

  if (!isInSameVoiceChannel(interaction, player)) {
    return interaction.reply({
      embeds: [createErrorEmbed('You need to be in my voice channel to use this panel.')],
      ephemeral: true,
    });
  }

  if (interaction.isButton()) {
    return handleMusicButton(interaction, client, player);
  }

  return handleMusicSelect(interaction, player);
}

async function handleMusicButton(interaction, client, player) {
  const song = player.queue.currentSong;

  if (interaction.customId === CONTROL_IDS.LYRICS) {
    await interaction.deferReply({ ephemeral: true });
    const lyricsCommand = client.commands.get('lyrics');
    const query = lyricsCommand.cleanSongTitle(`${song.title} ${song.channel ?? ''}`);
    const result = await lyricsCommand.findLyrics(query);

    if (result.error) {
      return interaction.editReply({ embeds: [createErrorEmbed(result.error)] });
    }

    return interaction.editReply(lyricsCommand.createLyricsPayload(client, interaction.user.id, result));
  }

  if (interaction.customId === CONTROL_IDS.QUEUE) {
    const upcoming = player.queue.getAllUpcoming();
    return interaction.reply({
      embeds: [createQueueEmbed(upcoming, player.queue.currentSong, 1)],
      ephemeral: true,
    });
  }

  if (interaction.customId === CONTROL_IDS.FAVORITE) {
    const result = addFavorite(interaction.user.id, song);
    const embed = result.added
      ? createSuccessEmbed(`Added **${song.title}** to your favorites.`)
      : createErrorEmbed('This song is already in your favorites.');

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await interaction.deferUpdate();

  if (interaction.customId === CONTROL_IDS.PAUSE_RESUME) {
    const action = player.audioPlayer.state.status === AudioPlayerStatus.Paused ? 'Resumed' : 'Paused';
    const ok = action === 'Resumed' ? player.resume() : player.pause();
    await refreshPanel(interaction, player);
    return interaction.followUp({
      embeds: [ok ? createSuccessEmbed(`${action} **${song.title}**.`) : createErrorEmbed('Playback state did not change.')],
      ephemeral: true,
    });
  }

  if (interaction.customId === CONTROL_IDS.SKIP) {
    const skipped = await player.skip();
    if (!skipped) {
      await interaction.editReply({
        embeds: [createSuccessEmbed(`Skipped **${song.title}**. Queue is now empty.`)],
        components: [],
      });
      return;
    }

    await refreshPanel(interaction, player);
    return interaction.followUp({ embeds: [createSuccessEmbed(`Skipped **${song.title}**.`)], ephemeral: true });
  }

  if (interaction.customId === CONTROL_IDS.STOP) {
    player.disconnect();
    interaction.client.musicPlayers.delete(interaction.guild.id);
    return interaction.editReply({
      embeds: [createSuccessEmbed('Stopped playback and cleared the playlist.')],
      components: [],
    });
  }
}

async function handleLyricsPage(interaction, client) {
  const [, direction, sessionId] = interaction.customId.split(':');
  const session = client.lyricsSessions?.get(sessionId);

  if (!session) {
    return interaction.reply({
      embeds: [createErrorEmbed('This lyrics page expired. Please request lyrics again.')],
      ephemeral: true,
    });
  }

  if (session.userId !== interaction.user.id) {
    return interaction.reply({
      embeds: [createErrorEmbed('This lyrics panel belongs to someone else.')],
      ephemeral: true,
    });
  }

  session.page += direction === 'next' ? 1 : -1;
  session.page = Math.max(0, Math.min(session.page, session.pages.length - 1));

  const lyricsCommand = client.commands.get('lyrics');
  await interaction.update(lyricsCommand.createLyricsPagePayload(session));
}

async function handleMusicSelect(interaction, player) {
  await interaction.deferUpdate();

  const value = interaction.values[0];

  if (interaction.customId === CONTROL_IDS.VOLUME) {
    const level = parseInt(value, 10);
    const error = validateVolume(level, interaction.user.id);
    if (error) {
      return interaction.followUp({ embeds: [createErrorEmbed(error)], ephemeral: true });
    }

    player.setVolume(level);
    await refreshPanel(interaction, player);
    return interaction.followUp({ embeds: [createSuccessEmbed(`Volume set to **${level}%**.`)], ephemeral: true });
  }

  if (interaction.customId === CONTROL_IDS.BASSBOOST) {
    if (value === 'off') {
      await player.removeFilter('bassboost');
      await refreshPanel(interaction, player);
      return interaction.followUp({ embeds: [createSuccessEmbed('Bassboost disabled.')], ephemeral: true });
    }

    const gain = BASSBOOST_LEVELS[value];
    await player.applyFilter('bassboost', `bass=g=${gain}`);
    await refreshPanel(interaction, player);
    return interaction.followUp({ embeds: [createSuccessEmbed(`Bassboost set to **+${gain}dB**.`)], ephemeral: true });
  }

  if (interaction.customId === CONTROL_IDS.FILTER) {
    if (value === 'clear_filters') {
      await player.clearFilters();
      await refreshPanel(interaction, player);
      return interaction.followUp({ embeds: [createSuccessEmbed('All filters cleared.')], ephemeral: true });
    }

    if (!AUDIO_FILTERS[value]) {
      return interaction.followUp({ embeds: [createErrorEmbed('Unknown filter selected.')], ephemeral: true });
    }

    await player.applyFilter(value, AUDIO_FILTERS[value]);
    await refreshPanel(interaction, player);
    return interaction.followUp({ embeds: [createSuccessEmbed(`Filter **${value}** applied.`)], ephemeral: true });
  }

  if (interaction.customId === CONTROL_IDS.LOOP) {
    player.queue.setLoopMode(LOOP_MODES[value.toUpperCase()]);
    await refreshPanel(interaction, player);
    return interaction.followUp({ embeds: [createSuccessEmbed(`Loop mode set to **${value}**.`)], ephemeral: true });
  }
}

function isInSameVoiceChannel(interaction, player) {
  const userChannelId = interaction.member?.voice?.channelId;
  const botChannelId = player.voiceConnection?.joinConfig?.channelId;
  return userChannelId && botChannelId && userChannelId === botChannelId;
}

function validateVolume(level, userId) {
  if (Number.isNaN(level) || level < 0) {
    return 'Volume must be **0** or higher.';
  }

  if (userId !== UNLIMITED_VOLUME_USER_ID && level > DEFAULT_MAX_VOLUME) {
    return 'sen yağız değilsin';
  }

  return null;
}

async function refreshPanel(interaction, player) {
  const song = player.queue.currentSong;
  if (!song) return;

  await interaction.editReply({
    embeds: [createNowPlayingEmbed(song, player)],
    components: createMusicControlRows(player),
  });
}

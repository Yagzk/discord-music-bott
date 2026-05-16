const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { AUDIO_FILTERS } = require('../player/AudioFilters');

const CONTROL_IDS = {
  PAUSE_RESUME: 'music:pause_resume',
  SKIP: 'music:skip',
  STOP: 'music:stop',
  LYRICS: 'music:lyrics',
  QUEUE: 'music:queue',
  FAVORITE: 'music:favorite',
  VOLUME: 'music:volume',
  BASSBOOST: 'music:bassboost',
  FILTER: 'music:filter',
  LOOP: 'music:loop',
};

function createMusicControlRows(player) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CONTROL_IDS.PAUSE_RESUME)
        .setLabel('Pause / Resume')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CONTROL_IDS.SKIP)
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CONTROL_IDS.STOP)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CONTROL_IDS.LYRICS)
        .setLabel('Lyrics')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CONTROL_IDS.FAVORITE)
        .setLabel('Favorite')
        .setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CONTROL_IDS.VOLUME)
        .setPlaceholder(`Volume: ${player.volume}%`)
        .addOptions(
          { label: '10%', value: '10', description: 'Quiet mode' },
          { label: '25%', value: '25', description: 'Low volume' },
          { label: '50%', value: '50', description: 'Normal user max' },
          { label: '75%', value: '75', description: 'Only Yagiz can use this' },
          { label: '100%', value: '100', description: 'Only Yagiz can use this' },
          { label: '150%', value: '150', description: 'Only Yagiz can use this' },
        ),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CONTROL_IDS.BASSBOOST)
        .setPlaceholder('Bassboost')
        .addOptions(
          { label: 'Off', value: 'off', description: 'Remove bassboost' },
          { label: 'Low', value: 'low', description: '+10dB' },
          { label: 'Medium', value: 'medium', description: '+20dB' },
          { label: 'High', value: 'high', description: '+30dB' },
          { label: 'Max', value: 'max', description: '+50dB' },
        ),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CONTROL_IDS.FILTER)
        .setPlaceholder('Filter seç')
        .addOptions(createFilterOptions()),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CONTROL_IDS.LOOP)
        .setPlaceholder(`Loop: ${player.loopMode}`)
        .addOptions(
          { label: 'Off', value: 'none', description: 'Loop kapalı' },
          { label: 'Track', value: 'track', description: 'Bu şarkıyı döndür' },
          { label: 'Queue', value: 'queue', description: 'Playlist döngüsü' },
        ),
    ),
  ];
}

function createFilterOptions() {
  const preferred = [
    'clear_filters',
    'nightcore',
    'vaporwave',
    '8d',
    'normalizer',
    'treble',
    'echo',
    'flanger',
    'vibrato',
    'tremolo',
    'karaoke',
    'mono',
  ];

  return preferred.map(name => {
    if (name === 'clear_filters') {
      return { label: 'Clear filters', value: name, description: 'Tüm filtreleri kaldır' };
    }

    return {
      label: name,
      value: name,
      description: AUDIO_FILTERS[name] ? `Apply ${name}` : 'Unavailable',
    };
  });
}

module.exports = { CONTROL_IDS, createMusicControlRows };

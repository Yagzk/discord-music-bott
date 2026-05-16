// Predefined FFmpeg audio filter strings
const AUDIO_FILTERS = {
  bassboost:      'bass=g=20',
  bassboost_low:  'bass=g=10',
  bassboost_high: 'bass=g=30',
  nightcore:      'aresample=48000,asetrate=48000*1.25',
  vaporwave:      'aresample=48000,asetrate=48000*0.8',
  '8d':           'apulsator=hz=0.125',
  surrounding:    'surround',
  pulsator:       'apulsator=hz=1',
  karaoke:        'stereotools=mlev=0.015625',
  flanger:        'flanger',
  gate:           'agate',
  haas:           'haas',
  mcompand:       'mcompand',
  mono:           'pan=mono|c0=.5*c0+.5*c1',
  normalizer:     'dynaudnorm=f=200',
  treble:         'treble=g=5',
  vibrato:        'vibrato=f=6.5',
  tremolo:        'tremolo',
  reverse:        'areverse',
  echo:           'aecho=0.8:0.88:60:0.4',
  phaser:         'aphaser=type=t:speed=2',
  compressor:     'acompressor',
  chorus:         'chorus=0.7:0.9:55:0.4:0.25:2',
};

/**
 * Converts the activeFilters map (key → ffmpeg filter string) into a
 * single comma-separated FFmpeg -af argument, or null if no filters are set.
 */
function buildFilterString(activeFilters) {
  if (!activeFilters || Object.keys(activeFilters).length === 0) return null;

  return Object.values(activeFilters)
    .filter(Boolean)
    .join(',');
}

module.exports = { AUDIO_FILTERS, buildFilterString };

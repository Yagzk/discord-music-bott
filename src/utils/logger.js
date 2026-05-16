const LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', DEBUG: 'DEBUG' };

function fmt(level, ...args) {
  const ts = new Date().toISOString();
  const msg = args
    .map(a => (a instanceof Error ? a.stack : typeof a === 'object' ? JSON.stringify(a) : a))
    .join(' ');
  return `[${ts}] [${level}] ${msg}`;
}

module.exports = {
  info: (...a) => console.log(fmt(LEVELS.INFO, ...a)),
  warn: (...a) => console.warn(fmt(LEVELS.WARN, ...a)),
  error: (...a) => console.error(fmt(LEVELS.ERROR, ...a)),
  debug: (...a) => {
    if (process.env.DEBUG === 'true') console.debug(fmt(LEVELS.DEBUG, ...a));
  },
};

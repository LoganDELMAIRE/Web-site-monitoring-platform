const debug = process.env.PLUGIN_DEBUG_MODE === 'true';

const logger = {
  log: (...args) => {
    if (debug) console.log(...args);
  },
  
  error: (...args) => {
    if (debug) console.error(...args);
  },
  
  warn: (...args) => {
    if (debug) console.warn(...args);
  },
  
  info: (...args) => {
    if (debug) console.info(...args);
  },
  
  debug: (...args) => {
    if (debug) console.debug(...args);
  },

  // Pour forcer l'affichage même si DEBUG_MODE est false
  force: {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  }
};

module.exports = logger; 
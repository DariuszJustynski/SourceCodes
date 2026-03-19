function logInfo(message, context = {}) {
  console.log(`[INFO] ${message}`, context);
}

function logError(message, context = {}) {
  console.error(`[ERROR] ${message}`, context);
}

module.exports = {
  logInfo,
  logError
};

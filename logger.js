// logger.js
function getCurrentTimestamp() {
  const now = new Date();
  return now.toISOString(); // Returns a standardized format like 2024-09-18T12:34:56.789Z
}

function logMessage(level, message) {
  console.log(`[${getCurrentTimestamp()}] [${level}] ${message}`);
}

module.exports = {
  info: (message) => logMessage('INFO', message),
  error: (message) => logMessage('ERROR', message)
};

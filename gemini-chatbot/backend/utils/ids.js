const crypto = require("crypto");

function generateClientId() {
  return `cli_${crypto.randomBytes(6).toString("hex")}`;
}

function generateApiKey() {
  return crypto.randomBytes(16).toString("hex");
}

function genSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
  }
}

module.exports = { generateClientId, generateApiKey, genSessionId };

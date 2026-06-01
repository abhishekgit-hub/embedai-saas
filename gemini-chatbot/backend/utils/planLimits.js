const Document = require("../models/Document");
const ChatSession = require("../models/ChatSession");

const DOC_LIMITS = { free: 3, starter: 10, pro: Infinity };
const CHAT_LIMITS = { free: 100, starter: 1000, pro: Infinity };

async function checkDocLimit(client) {
  const limit = DOC_LIMITS[client.plan] ?? DOC_LIMITS.free;
  if (!Number.isFinite(limit)) return null;
  const count = await Document.countDocuments({ clientId: client.clientId });
  if (count >= limit) {
    return `Document limit reached (${limit} max on ${client.plan} plan). Upgrade to add more.`;
  }
  return null;
}

async function checkChatLimit(client) {
  const limit = CHAT_LIMITS[client.plan] ?? CHAT_LIMITS.free;
  if (!Number.isFinite(limit)) return null;
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const count = await ChatSession.countDocuments({
    clientId: client.clientId,
    createdAt: { $gte: start },
  });
  if (count >= limit) {
    return `Monthly chat limit reached (${limit} on ${client.plan} plan).`;
  }
  return null;
}

module.exports = { DOC_LIMITS, CHAT_LIMITS, checkDocLimit, checkChatLimit };

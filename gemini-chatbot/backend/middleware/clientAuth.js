const jwt = require("jsonwebtoken");
const Client = require("../models/Client");
const { clientCanUsePlatform, clientApprovalMessage } = require("../utils/clientApproval");

module.exports = async function clientAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.CLIENT_JWT_SECRET);
    const client = await Client.findById(decoded.id).select("-password");
    if (!client) {
      return res.status(401).json({ error: "Client not found" });
    }
    if (!clientCanUsePlatform(client)) {
      return res.status(403).json({
        error: clientApprovalMessage(client) || "Account not available.",
      });
    }
    req.client = client;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

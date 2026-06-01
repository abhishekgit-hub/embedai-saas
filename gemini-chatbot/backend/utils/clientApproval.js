/** Whether a client may log in, use dashboard, or serve the widget. */
function clientCanUsePlatform(client) {
  if (!client) return false;
  if (client.approvalStatus === "rejected") return false;
  if (client.approvalStatus === "pending") return false;
  if (client.approvalStatus === "approved") return client.isActive === true;
  // Legacy accounts (before approval flow)
  return client.isActive === true;
}

function clientApprovalMessage(client) {
  if (!client) return "Account not found.";
  if (client.approvalStatus === "pending") {
    return "Your account is pending admin approval. You will be able to log in once approved.";
  }
  if (client.approvalStatus === "rejected") {
    return "Your signup request was not approved. Contact the administrator.";
  }
  if (!client.isActive) {
    return "Account disabled. Contact support.";
  }
  return null;
}

module.exports = { clientCanUsePlatform, clientApprovalMessage };

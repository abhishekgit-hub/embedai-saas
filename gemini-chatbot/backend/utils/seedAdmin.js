const Admin = require("../models/Admin");

module.exports = async function seedAdmin() {
  try {
    const existing = await Admin.findOne({});
    if (!existing) {
      await Admin.create({
        email: process.env.ADMIN_EMAIL || "admin@chatbot.com",
        password: process.env.ADMIN_PASSWORD || "Admin@123456",
      });
      console.log("✅ Default admin created:", process.env.ADMIN_EMAIL || "admin@chatbot.com");
      console.log("   Password:", process.env.ADMIN_PASSWORD || "Admin@123456");
    }
  } catch (err) {
    console.error("Seed admin error:", err.message);
  }
};

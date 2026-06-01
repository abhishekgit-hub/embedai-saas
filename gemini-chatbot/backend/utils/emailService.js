const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP email for email verification or email change
 */
async function sendOTPEmail({ to, otp, purpose }) {
  try {
    const purposeText = purpose === "verify-email" ? "Email Verification" : "Email Change";
    
    console.log(`[EmailService] Sending OTP email to: ${to}, purpose: ${purpose}`);
    console.log(`[EmailService] Using from email: ${process.env.RESEND_FROM_EMAIL}`);
    console.log(`[EmailService] API Key present: ${!!process.env.RESEND_API_KEY}`);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${purposeText}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 500px; margin: 40px auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #6c63ff; margin: 0 0 20px 0; font-size: 24px;">AI Chatbot Platform</h1>
          <p style="color: #333; margin: 0 0 20px 0; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 16px 32px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; letter-spacing: 8px; color: #333; font-weight: bold;">${otp}</span>
          </div>
          <p style="color: #666; margin: 20px 0; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; margin: 20px 0; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: `Your verification code - ${purpose}`,
      html,
    });

    console.log(`[EmailService] Email sent successfully:`, result);
    return { success: true };
  } catch (error) {
    console.error("[EmailService] Error sending OTP email:", error);
    console.error("[EmailService] Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail({ to, resetLink, userType }) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 500px; margin: 40px auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #6c63ff; margin: 0 0 20px 0; font-size: 24px;">AI Chatbot Platform</h1>
          <p style="color: #333; margin: 0 0 20px 0; font-size: 16px;">Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #6c63ff; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; margin: 20px 0; font-size: 14px;">This link expires in 1 hour.</p>
          <p style="color: #999; margin: 20px 0; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: "Reset your password",
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
};

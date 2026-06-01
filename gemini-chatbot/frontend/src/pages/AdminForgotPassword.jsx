import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminForgotPassword, adminResetPassword } from "../utils/api";
import PasswordStrength from "../components/PasswordStrength";
import styles from "./AdminLogin.module.css";

export default function AdminForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: send OTP, 2: verify OTP and reset password

  async function handleSendOTP(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await adminForgotPassword(email);
      setStep(2);
      setSuccess("OTP sent to your email");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await adminResetPassword(email, otp, newPassword);
      setSuccess("Password reset successfully");
      setStep(3); // Success state
      setTimeout(() => navigate("/admin/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (step === 3) {
    return (
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>✓</div>
            <h1>Password Reset</h1>
            <p>{success}</p>
          </div>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text2)" }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.icon}>🔑</div>
          <h1>Forgot Password</h1>
          <p>{step === 1 ? "Enter your email to receive OTP" : "Enter OTP and new password"}</p>
        </div>
        
        {step === 1 ? (
          <form onSubmit={handleSendOTP} className={styles.form}>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            {success && <div style={{ color: "#22c55e", marginBottom: 12 }}>{success}</div>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={email} disabled style={{ background: "var(--bg3)" }} />
            </div>
            <div className={styles.field}>
              <label>OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} placeholder="Enter 6-digit OTP" autoFocus style={{ textAlign: "center", letterSpacing: 8, fontSize: 20 }} />
            </div>
            <div className={styles.field}>
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
              <PasswordStrength password={newPassword} />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
            <button type="button" className={styles.submitBtn} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", marginTop: 8 }} onClick={() => setStep(1)}>
              Back
            </button>
          </form>
        )}
        
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text2)" }}>
          Remember your password? <Link to="/admin/login" style={{ color: "var(--accent)" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

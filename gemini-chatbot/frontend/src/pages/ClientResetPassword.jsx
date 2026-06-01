import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../utils/clientApi";
import PasswordStrength from "../components/PasswordStrength";
import styles from "./AdminLogin.module.css";

export default function ClientResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid or expired reset link");
      setIsValidToken(false);
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess("Password reset! Login now");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  }

  if (!isValidToken || error && !success) {
    return (
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>⚠️</div>
            <h1>Invalid Link</h1>
            <p>{error || "This reset link is invalid or has expired"}</p>
          </div>
          <Link to="/client/forgot-password" className={styles.submitBtn} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
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
          <Link to="/client/login" className={styles.submitBtn} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            Log in
          </Link>
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
          <div className={styles.icon}>🔐</div>
          <h1>Reset Password</h1>
          <p>Enter your new password</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
            <PasswordStrength password={newPassword} />
          </div>
          <div className={styles.field}>
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

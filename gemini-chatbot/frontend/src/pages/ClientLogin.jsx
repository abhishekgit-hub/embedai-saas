import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clientLogin, verifyEmail, resendOTP } from "../utils/clientApi";
import { useClientAuth } from "../context/ClientAuthContext";
import OTPInput from "../components/OTPInput";
import styles from "./AdminLogin.module.css";

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const { login } = useClientAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await clientLogin(email, password);
      if (res.data.requiresVerification) {
        setRequiresVerification(true);
        setVerificationEmail(res.data.email);
        startResendCountdown();
      } else {
        login(res.data.token, res.data.client);
        navigate("/client/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    setError("");
    setLoading(true);
    try {
      const res = await verifyEmail(verificationEmail, otp);
      login(res.data.token, res.data.client);
      navigate("/client/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setError("");
    setLoading(true);
    try {
      await resendOTP(verificationEmail, "verify-email");
      setCanResend(false);
      setResendCountdown(30);
      startResendCountdown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  function startResendCountdown() {
    setResendCountdown(30);
    setCanResend(false);
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  if (requiresVerification) {
    return (
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>🔐</div>
            <h1>Verify Email</h1>
            <p>We sent a 6-digit code to {verificationEmail}</p>
          </div>
          <div className={styles.form}>
            <OTPInput length={6} onComplete={setOtp} onChange={setOtp} />
            {error && <div className={styles.error}>{error}</div>}
            <button
              onClick={handleVerifyOTP}
              className={styles.submitBtn}
              disabled={loading || otp.length !== 6}
              style={{ marginTop: "24px" }}
            >
              {loading ? "Verifying…" : "Verify Email"}
            </button>
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              {canResend ? (
                <button
                  onClick={handleResendOTP}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "14px",
                  }}
                  disabled={loading}
                >
                  Resend code
                </button>
              ) : (
                <span style={{ fontSize: "14px", color: "var(--text2)" }}>
                  Resend code in {resendCountdown}s
                </span>
              )}
            </div>
          </div>
          <a href="/" className={styles.backLink}>
            ← Back to Chat
          </a>
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
          <div className={styles.icon}>🏢</div>
          <h1>Client Login</h1>
          <p>Manage your AI chatbot & embed widget</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.passWrap}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass((p) => !p)}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div style={{ textAlign: "right", marginTop: "8px" }}>
            <Link to="/client/forgot-password" style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text2)" }}>
          No account? <Link to="/client/signup" style={{ color: "var(--accent)" }}>Sign up</Link>
        </p>
        <a href="/" className={styles.backLink}>
          ← Back to Chat
        </a>
      </div>
    </div>
  );
}

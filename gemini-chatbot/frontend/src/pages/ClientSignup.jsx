import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clientSignup, verifyEmail, resendOTP } from "../utils/clientApi";
import { useClientAuth } from "../context/ClientAuthContext";
import OTPInput from "../components/OTPInput";
import styles from "./AdminLogin.module.css";

export default function ClientSignup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    email: "",
    domain: "",
    password: "",
    confirm: "",
  });
  const [signupEmail, setSignupEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const { login } = useClientAuth();

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await clientSignup({
        businessName: form.businessName,
        email: form.email,
        domain: form.domain,
        password: form.password,
      });
      setSignupEmail(form.email);
      setStep(2);
      startResendCountdown();
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    setError("");
    setLoading(true);
    try {
      const res = await verifyEmail(signupEmail, otp);
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
      await resendOTP(signupEmail, "verify-email");
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

  // Step 1: Signup form
  if (step === 1) {
    return (
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>🚀</div>
            <h1>Create Account</h1>
            <p>Request access — super admin approval required</p>
          </div>
          <form onSubmit={handleSignupSubmit} className={styles.form}>
            {["businessName", "email", "domain"].map((key) => (
              <div key={key} className={styles.field}>
                <label>
                  {key === "businessName"
                    ? "Business Name"
                    : key === "domain"
                    ? "Website Domain"
                    : "Email"}
                </label>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={key === "domain" ? "example.com" : ""}
                  required
                />
              </div>
            ))}
            <div className={styles.field}>
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className={styles.field}>
              <label>Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setField("confirm", e.target.value)}
                required
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text2)" }}>
            Have an account? <Link to="/client/login" style={{ color: "var(--accent)" }}>Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: OTP verification
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
          <p>We sent a 6-digit code to {signupEmail}</p>
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
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getStats, getDocuments, deleteDocument, toggleDocument,
  uploadDocument, addTextDocument, getSettings, saveSettings,
  changePassword, getClients, getPendingClients, approveClient, rejectClient,
  toggleClient, deleteClient, getClientDocs, adminChangeEmail, adminVerifyChangeEmail,
  getWidgetSessions, deleteWidgetSessions, deleteAllWidgetSessions,
  getAdminSessions, deleteAdminSessions, deleteAllAdminSessions,
} from "../utils/api";
import styles from "./AdminDashboard.module.css";

// ─────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: color + "22", color }}>
        {icon}
      </div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={styles.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loader}><div className="spinner" style={{width:28,height:28}} /></div>;
  if (!stats) return <div className={styles.empty}>Failed to load stats</div>;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Dashboard Overview</h2>

      <div className={styles.statsGrid}>
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          label="Active Documents"
          value={stats.docCount}
          sub={`${stats.totalDocs} total`}
          color="#6c63ff"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          label="Total Chats"
          value={stats.totalChats}
          sub="all sessions"
          color="#22c55e"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
          label="Knowledge Base"
          value={`${stats.totalKb} KB`}
          sub={`${stats.totalChars?.toLocaleString()} chars`}
          color="#f59e0b"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          label="AI Model"
          value="Gemini"
          sub={stats.model}
          color="#a855f7"
        />
        {(stats.pendingClients ?? 0) > 0 && (
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            label="Pending Approvals"
            value={stats.pendingClients}
            sub="client signups"
            color="#ef4444"
          />
        )}
      </div>

      {stats.recentChats?.length > 0 && (
        <div className={styles.recentSection}>
          <h3>Recent Conversations</h3>
          <div className={styles.recentList}>
            {stats.recentChats.map(c => (
              <div key={c._id} className={styles.recentItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className={styles.recentTitle}>{c.title}</span>
                <span className={styles.recentDate}>{new Date(c.updatedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Documents Tab
// ─────────────────────────────────────────
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState("upload"); // "upload" | "paste"
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    try {
      const res = await getDocuments();
      setDocs(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  function showMsg(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleFileUpload(files) {
    if (!files?.length) return;
    const file = files[0];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", file.name.replace(/\.[^.]+$/, ""));
      await uploadDocument(fd);
      showMsg(`"${file.name}" uploaded successfully`);
      await loadDocs();
    } catch (err) {
      showMsg(err.response?.data?.error || "Upload failed", "error");
    } finally { setUploading(false); }
  }

  async function handlePasteSubmit() {
    if (!textTitle.trim() || !textContent.trim()) return;
    setUploading(true);
    try {
      await addTextDocument(textTitle, textContent);
      showMsg("Text document added successfully");
      setTextTitle(""); setTextContent("");
      await loadDocs();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to add", "error");
    } finally { setUploading(false); }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await deleteDocument(id);
      setDocs(prev => prev.filter(d => d._id !== id));
      showMsg("Document deleted");
    } catch { showMsg("Delete failed", "error"); }
  }

  async function handleToggle(id) {
    try {
      const res = await toggleDocument(id);
      setDocs(prev => prev.map(d => d._id === id ? { ...d, isActive: res.data.isActive } : d));
    } catch {}
  }

  function fileIcon(type) {
    const map = { pdf: "📄", txt: "📝", md: "📋", csv: "📊", text: "✏️" };
    return map[type] || "📁";
  }

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Knowledge Base</h2>
      <p className={styles.tabDesc}>Upload documents or paste text. The AI will use this data to answer user questions.</p>

      {msg && (
        <div className={`${styles.toast} ${msg.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {msg.text}
        </div>
      )}

      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button className={`${styles.modeBtn} ${mode === "upload" ? styles.modeActive : ""}`} onClick={() => setMode("upload")}>
          Upload File
        </button>
        <button className={`${styles.modeBtn} ${mode === "paste" ? styles.modeActive : ""}`} onClick={() => setMode("paste")}>
          Paste Text
        </button>
      </div>

      {mode === "upload" ? (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ""}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.csv"
            style={{ display: "none" }}
            onChange={e => handleFileUpload(e.target.files)}
          />
          {uploading ? (
            <div className={styles.dropContent}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <p>Processing document...</p>
            </div>
          ) : (
            <div className={styles.dropContent}>
              <div className={styles.dropIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
              </div>
              <p><strong>Drop file here</strong> or click to browse</p>
              <span>PDF, TXT, MD, CSV · Max 20 MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.pasteBox}>
          <input
            className={styles.pasteTitle}
            placeholder="Document title (e.g. College Admission FAQ)"
            value={textTitle}
            onChange={e => setTextTitle(e.target.value)}
          />
          <textarea
            className={styles.pasteText}
            placeholder="Paste your text here — FAQs, policies, product info, anything the AI should know..."
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            rows={8}
          />
          <button
            className={styles.addBtn}
            onClick={handlePasteSubmit}
            disabled={uploading || !textTitle.trim() || !textContent.trim()}
          >
            {uploading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Add to Knowledge Base"}
          </button>
        </div>
      )}

      {/* Document list */}
      <div className={styles.docSection}>
        <h3>Uploaded Documents ({docs.length})</h3>
        {loading ? (
          <div className={styles.loader}><div className="spinner" /></div>
        ) : docs.length === 0 ? (
          <div className={styles.empty}>No documents yet. Upload some to get started.</div>
        ) : (
          <div className={styles.docList}>
            {docs.map(doc => (
              <div key={doc._id} className={`${styles.docItem} ${!doc.isActive ? styles.docInactive : ""}`}>
                <span className={styles.docEmoji}>{fileIcon(doc.fileType)}</span>
                <div className={styles.docInfo}>
                  <span className={styles.docTitle}>{doc.title}</span>
                  <span className={styles.docMeta}>
                    {doc.fileType.toUpperCase()} · {doc.size < 1024 ? doc.size + " B" : Math.round(doc.size / 1024) + " KB"} · {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.docActions}>
                  <button
                    className={`${styles.toggleDocBtn} ${doc.isActive ? styles.activeDoc : styles.inactiveDoc}`}
                    onClick={() => handleToggle(doc._id)}
                    title={doc.isActive ? "Disable" : "Enable"}
                  >
                    {doc.isActive ? "Active" : "Disabled"}
                  </button>
                  <button className={styles.delBtn} onClick={() => handleDelete(doc._id, doc.title)} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────
function SettingsTab() {
  const { admin } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [chatbotName, setChatbotName] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [msg, setMsg] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(false);
  
  // Change email state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1); // 1: enter email+password, 2: enter OTP
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    getSettings().then(r => {
      setApiConfigured(!!r.data.gemini_api_key);
      setChatbotName(r.data.chatbot_name || "AI Assistant");
      setWelcomeMsg(r.data.welcome_message || "Hello! How can I help you today?");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = { chatbot_name: chatbotName, welcome_message: welcomeMsg };
      if (apiKey.trim()) body.gemini_api_key = apiKey.trim();
      await saveSettings(body);
      if (apiKey.trim()) { setApiConfigured(true); setApiKey(""); }
      showMsg("Settings saved successfully");
    } catch { showMsg("Failed to save settings", "error"); }
    finally { setSaving(false); }
  }

  async function handleChangePass() {
    if (!curPass || !newPass) return;
    if (newPass.length < 8) { showMsg("New password must be at least 8 characters", "error"); return; }
    setChangingPass(true);
    try {
      await changePassword(curPass, newPass);
      setCurPass(""); setNewPass("");
      showMsg("Password changed successfully");
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to change password", "error");
    } finally { setChangingPass(false); }
  }

  async function handleChangeEmailStep1() {
    if (!newEmail || !emailPassword) return;
    setChangingEmail(true);
    try {
      await adminChangeEmail(newEmail, emailPassword);
      setEmailStep(2);
      setEmailPassword("");
      showMsg("OTP sent to new email");
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to send OTP", "error");
    } finally { setChangingEmail(false); }
  }

  async function handleChangeEmailStep2() {
    if (!emailOtp) return;
    setChangingEmail(true);
    try {
      await adminVerifyChangeEmail(emailOtp);
      setShowChangeEmail(false);
      setEmailStep(1);
      setNewEmail("");
      setEmailOtp("");
      showMsg("Email updated successfully");
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to verify OTP", "error");
    } finally { setChangingEmail(false); }
  }

  function resetChangeEmail() {
    setShowChangeEmail(false);
    setEmailStep(1);
    setNewEmail("");
    setEmailPassword("");
    setEmailOtp("");
  }

  if (loading) return <div className={styles.loader}><div className="spinner" style={{width:28,height:28}} /></div>;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Settings</h2>

      {msg && (
        <div className={`${styles.toast} ${msg.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {msg.text}
        </div>
      )}

      {/* Gemini API Key */}
      <div className={styles.settingSection}>
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Gemini API Key
        </h3>
        <p className={styles.settingDesc}>
          Get your free key at{" "}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
            aistudio.google.com
          </a>
        </p>
        {apiConfigured && (
          <div className={styles.configuredBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            API key is configured
          </div>
        )}
        <input
          type="password"
          className={styles.settingInput}
          placeholder={apiConfigured ? "Enter new key to replace current" : "AIza..."}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>

      {/* Chatbot name */}
      <div className={styles.settingSection}>
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chatbot Name
        </h3>
        <input
          className={styles.settingInput}
          placeholder="AI Assistant"
          value={chatbotName}
          onChange={e => setChatbotName(e.target.value)}
        />
      </div>

      {/* Welcome message */}
      <div className={styles.settingSection}>
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          Welcome Message
        </h3>
        <textarea
          className={styles.settingTextarea}
          placeholder="Hello! How can I help you today?"
          value={welcomeMsg}
          onChange={e => setWelcomeMsg(e.target.value)}
          rows={3}
        />
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Save Settings"}
      </button>

      {/* Change Password */}
      <div className={styles.divider} />
      <div className={styles.settingSection}>
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Change Admin Password
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="password"
            className={styles.settingInput}
            placeholder="Current password"
            value={curPass}
            onChange={e => setCurPass(e.target.value)}
          />
          <input
            type="password"
            className={styles.settingInput}
            placeholder="New password (min 8 chars)"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
          />
        </div>
        <button
          className={styles.saveBtn}
          style={{ marginTop: 12, background: "var(--bg3)", border: "1px solid var(--border2)" }}
          onClick={handleChangePass}
          disabled={changingPass || !curPass || !newPass}
        >
          {changingPass ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Change Password"}
        </button>
      </div>

      {/* Change Email */}
      <div className={styles.divider} />
      <div className={styles.settingSection}>
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </h3>
        <div className={styles.configuredBadge} style={{ marginBottom: 12 }}>
          {admin?.email}
        </div>
        {!showChangeEmail ? (
          <button
            className={styles.saveBtn}
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
            onClick={() => setShowChangeEmail(true)}
          >
            Change Email
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            {emailStep === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="email"
                  className={styles.settingInput}
                  placeholder="New email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
                <input
                  type="password"
                  className={styles.settingInput}
                  placeholder="Current password"
                  value={emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={styles.saveBtn}
                    style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)" }}
                    onClick={resetChangeEmail}
                    disabled={changingEmail}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    style={{ flex: 1 }}
                    onClick={handleChangeEmailStep1}
                    disabled={changingEmail || !newEmail || !emailPassword}
                  >
                    {changingEmail ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Send OTP"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>
                  Enter the 6-digit code sent to {newEmail}
                </p>
                <input
                  type="text"
                  className={styles.settingInput}
                  placeholder="Enter OTP"
                  value={emailOtp}
                  onChange={e => setEmailOtp(e.target.value)}
                  maxLength={6}
                  style={{ textAlign: "center", letterSpacing: 8, fontSize: 20 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={styles.saveBtn}
                    style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)" }}
                    onClick={resetChangeEmail}
                    disabled={changingEmail}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    style={{ flex: 1 }}
                    onClick={handleChangeEmailStep2}
                    disabled={changingEmail || emailOtp.length !== 6}
                  >
                    {changingEmail ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Verify"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Admin Dashboard
// ─────────────────────────────────────────
function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [clientDocs, setClientDocs] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [allRes, pendingRes] = await Promise.all([
        getClients(),
        getPendingClients(),
      ]);
      setClients(allRes.data);
      setPending(pendingRes.data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    await approveClient(id);
    load();
  }

  async function handleReject(id, name) {
    if (!window.confirm(`Reject signup request from "${name}"?`)) return;
    await rejectClient(id);
    load();
  }

  async function handleToggle(id) {
    try {
      await toggleClient(id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Could not update client");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete client "${name}" and all their data?`)) return;
    await deleteClient(id);
    setSelected(null);
    setClientDocs(null);
    load();
  }

  async function viewDocs(id) {
    const res = await getClientDocs(id);
    setClientDocs(res.data);
    setSelected(id);
  }

  if (loading) return <div className={styles.loader}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Clients</h2>
      <p className={styles.tabDesc}>Approve signup requests and manage business accounts.</p>

      {pending.length > 0 && (
        <div className={styles.recentSection} style={{ marginBottom: 28, borderColor: "var(--accent)" }}>
          <h3>Pending approval ({pending.length})</h3>
          <div className={styles.docList}>
            {pending.map((c) => (
              <div key={c._id} className={styles.docItem}>
                <div className={styles.docInfo}>
                  <span className={styles.docTitle}>{c.businessName}</span>
                  <span className={styles.docMeta}>
                    {c.email} · {c.domain} · Requested {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={styles.docActions}>
                  <button
                    className={`${styles.toggleDocBtn} ${styles.activeDoc}`}
                    onClick={() => handleApprove(c._id)}
                  >
                    Approve
                  </button>
                  <button className={styles.delBtn} onClick={() => handleReject(c._id, c.businessName)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3>All clients</h3>
      {clients.length === 0 ? (
        <div className={styles.empty}>No clients yet.</div>
      ) : (
        <div className={styles.docList}>
          {clients.map((c) => (
            <div key={c._id} className={styles.docItem} style={{ cursor: "pointer" }} onClick={() => viewDocs(c._id)}>
              <div className={styles.docInfo}>
                <span className={styles.docTitle}>{c.businessName}</span>
                <span className={styles.docMeta}>
                  {c.email} · {c.domain} · {c.plan} · {c.docCount} docs · {c.totalChats} chats
                </span>
                <span className={styles.docMeta}>
                  Status: {c.approvalStatus || "approved"}
                  {c.approvalStatus === "approved" ? (c.isActive ? " · Active" : " · Disabled") : ""}
                  {" · "}Joined {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.docActions} onClick={(e) => e.stopPropagation()}>
                {c.approvalStatus === "pending" && (
                  <>
                    <button className={`${styles.toggleDocBtn} ${styles.activeDoc}`} onClick={() => handleApprove(c._id)}>Approve</button>
                    <button className={styles.delBtn} onClick={() => handleReject(c._id, c.businessName)}>Reject</button>
                  </>
                )}
                {c.approvalStatus === "approved" && (
                <button
                  className={`${styles.toggleDocBtn} ${c.isActive ? styles.activeDoc : styles.inactiveDoc}`}
                  onClick={() => handleToggle(c._id)}
                >
                  {c.isActive ? "Active" : "Disabled"}
                </button>
                )}
                <button className={styles.delBtn} onClick={() => handleDelete(c._id, c.businessName)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clientDocs && (
        <div className={styles.recentSection} style={{ marginTop: 32 }}>
          <h3>Documents: {clientDocs.client?.businessName}</h3>
          {clientDocs.docs?.length ? (
            <ul style={{ color: "var(--text2)", fontSize: 14 }}>
              {clientDocs.docs.map((d) => (
                <li key={d._id}>{d.title} ({d.fileType}) — {d.isActive ? "active" : "disabled"}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text3)" }}>No documents</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Widget Chats Tab
// ─────────────────────────────────────────
function WidgetChatsTab() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  function loadSessions() {
    setLoading(true);
    getWidgetSessions()
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleSelectAll() {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.sessionId)));
    }
  }

  function handleSelectSession(sessionId) {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  }

  async function handleDeleteSelected() {
    if (selectedSessions.size === 0) return;
    
    if (!confirm(`Delete ${selectedSessions.size} selected chat sessions? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const sessionIds = Array.from(selectedSessions);
      await deleteWidgetSessions(sessionIds);
      setToast({ type: "success", message: `Deleted ${selectedSessions.size} sessions` });
      setSelectedSessions(new Set());
      loadSessions();
    } catch (err) {
      setToast({ type: "error", message: "Failed to delete sessions" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Delete ALL widget chat sessions? This will delete ${sessions.length} sessions and cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAllWidgetSessions();
      setToast({ type: "success", message: `Deleted all ${sessions.length} sessions` });
      setSelectedSessions(new Set());
      loadSessions();
    } catch (err) {
      setToast({ type: "error", message: "Failed to delete all sessions" });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className={styles.loader}><div className="spinner" style={{width:28,height:28}} /></div>;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Widget Chats</h2>
      <p className={styles.tabDesc}>
        Manage and delete chat sessions from widgets on client websites. These chats are stored permanently unless deleted manually.
      </p>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className={styles.saveBtn}
          onClick={handleSelectAll}
          disabled={sessions.length === 0}
        >
          {selectedSessions.size === sessions.length ? "Deselect All" : "Select All"}
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleDeleteSelected}
          disabled={selectedSessions.size === 0 || deleting}
          style={{ background: "var(--red)", border: "none" }}
        >
          {deleting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : `Delete Selected (${selectedSessions.size})`}
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleDeleteAll}
          disabled={sessions.length === 0 || deleting}
          style={{ background: "var(--red)", border: "none" }}
        >
          {deleting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Delete All Chats"}
        </button>
        <button
          className={styles.saveBtn}
          onClick={loadSessions}
          disabled={loading}
          style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginBottom: 12, color: "var(--text2)", fontSize: 13 }}>
        Total: {sessions.length} sessions · Selected: {selectedSessions.size}
      </div>

      {sessions.length === 0 ? (
        <div className={styles.empty}>No widget chat sessions found.</div>
      ) : (
        <div className={styles.docList}>
          {sessions.map((s) => (
            <div key={s.sessionId} className={styles.docItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedSessions.has(s.sessionId)}
                  onChange={() => handleSelectSession(s.sessionId)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <div className={styles.docInfo}>
                  <span className={styles.docTitle}>{s.title || "Untitled Chat"}</span>
                  <span className={styles.docMeta}>
                    Client ID: {s.clientId} · {s.messages?.length || 0} messages · Created {new Date(s.createdAt).toLocaleString()}
                  </span>
                  <span className={styles.docMeta}>
                    Last updated: {new Date(s.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// New Chats Tab (Landing Page)
// ─────────────────────────────────────────
function NewChatsTab() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  function loadSessions() {
    setLoading(true);
    getAdminSessions()
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleSelectAll() {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.sessionId)));
    }
  }

  function handleSelectSession(sessionId) {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  }

  async function handleDeleteSelected() {
    if (selectedSessions.size === 0) return;
    
    if (!confirm(`Delete ${selectedSessions.size} selected chat sessions? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const sessionIds = Array.from(selectedSessions);
      await deleteAdminSessions(sessionIds);
      setToast({ type: "success", message: `Deleted ${selectedSessions.size} sessions` });
      setSelectedSessions(new Set());
      loadSessions();
    } catch (err) {
      setToast({ type: "error", message: "Failed to delete sessions" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Delete ALL landing page chat sessions? This will delete ${sessions.length} sessions and cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAllAdminSessions();
      setToast({ type: "success", message: `Deleted all ${sessions.length} sessions` });
      setSelectedSessions(new Set());
      loadSessions();
    } catch (err) {
      setToast({ type: "error", message: "Failed to delete all sessions" });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className={styles.loader}><div className="spinner" style={{width:28,height:28}} /></div>;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>New Chats</h2>
      <p className={styles.tabDesc}>
        Manage and delete chat sessions from the landing page AI assistant. These chats are stored permanently unless deleted manually.
      </p>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className={styles.saveBtn}
          onClick={handleSelectAll}
          disabled={sessions.length === 0}
        >
          {selectedSessions.size === sessions.length ? "Deselect All" : "Select All"}
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleDeleteSelected}
          disabled={selectedSessions.size === 0 || deleting}
          style={{ background: "var(--red)", border: "none" }}
        >
          {deleting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : `Delete Selected (${selectedSessions.size})`}
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleDeleteAll}
          disabled={sessions.length === 0 || deleting}
          style={{ background: "var(--red)", border: "none" }}
        >
          {deleting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Delete All Chats"}
        </button>
        <button
          className={styles.saveBtn}
          onClick={loadSessions}
          disabled={loading}
          style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginBottom: 12, color: "var(--text2)", fontSize: 13 }}>
        Total: {sessions.length} sessions · Selected: {selectedSessions.size}
      </div>

      {sessions.length === 0 ? (
        <div className={styles.empty}>No landing page chat sessions found.</div>
      ) : (
        <div className={styles.docList}>
          {sessions.map((s) => (
            <div key={s.sessionId} className={styles.docItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedSessions.has(s.sessionId)}
                  onChange={() => handleSelectSession(s.sessionId)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <div className={styles.docInfo}>
                  <span className={styles.docTitle}>{s.title || "Untitled Chat"}</span>
                  <span className={styles.docMeta}>
                    {s.messages?.length || 0} messages · Created {new Date(s.createdAt).toLocaleString()}
                  </span>
                  <span className={styles.docMeta}>
                    Last updated: {new Date(s.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { id: "clients", label: "Clients", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: "new-chats", label: "New Chats", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { id: "widget-chats", label: "Widget Chats", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { id: "docs", label: "Knowledge Base", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { id: "settings", label: "Settings", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/></svg> },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>✦</div>
            <div>
              <div className={styles.logoName}>Admin Panel</div>
              <div className={styles.logoEmail}>{admin?.email}</div>
            </div>
          </div>

          <nav className={styles.nav}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.navActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <a href="/" className={styles.chatLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            View Chat
          </a>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {tab === "overview" && <OverviewTab />}
        {tab === "clients" && <ClientsTab />}
        {tab === "new-chats" && <NewChatsTab />}
        {tab === "widget-chats" && <WidgetChatsTab />}
        {tab === "docs" && <DocumentsTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}

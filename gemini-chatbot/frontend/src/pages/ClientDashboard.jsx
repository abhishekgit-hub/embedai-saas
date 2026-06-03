import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "../context/ClientAuthContext";
import {
  getClientStats,
  getClientDocuments,
  uploadClientDocument,
  addClientTextDocument,
  deleteClientDocument,
  toggleClientDocument,
  updateClientProfile,
  changeClientPassword,
  deleteClientAccount,
  changeEmail,
  verifyChangeEmail,
} from "../utils/clientApi";
import styles from "./AdminDashboard.module.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://embedai-backend.onrender.com";
const WIDGET_BASE = process.env.REACT_APP_WIDGET_URL || window.location.origin;

function OverviewTab({ stats, onRefresh }) {
  if (!stats) return <div className={styles.loader}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  const docLimit = stats.docLimit ?? "∞";
  const docUsed = stats.docCount ?? 0;

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Welcome, {stats.businessName}</h2>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#6c63ff22", color: "#6c63ff" }}>📄</div>
          <div>
            <div className={styles.statValue}>{docUsed}</div>
            <div className={styles.statLabel}>Documents</div>
            <div className={styles.statSub}>{docUsed}/{docLimit} used</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#22c55e22", color: "#22c55e" }}>💬</div>
          <div>
            <div className={styles.statValue}>{stats.totalChats}</div>
            <div className={styles.statLabel}>Total Chats</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#f59e0b22", color: "#f59e0b" }}>⭐</div>
          <div>
            <div className={styles.statValue}>{stats.plan}</div>
            <div className={styles.statLabel}>Current Plan</div>
          </div>
        </div>
      </div>
      {stats.plan === "free" && (
        <div className={styles.recentSection} style={{ marginTop: 24 }}>
          <h3>Upgrade your plan</h3>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>
            Free plan: 3 documents, 100 chats/month. Contact admin to upgrade to Starter or Pro.
          </p>
        </div>
      )}
      <button className={styles.saveBtn} style={{ marginTop: 16 }} onClick={onRefresh}>Refresh stats</button>
    </div>
  );
}

function KnowledgeTab({ stats }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState("upload");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();

  const docLimit = stats?.docLimit;
  const atLimit = docLimit != null && docs.length >= docLimit;

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    try {
      const res = await getClientDocuments();
      setDocs(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  function showMsg(text, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleFileUpload(files) {
    if (!files?.length || atLimit) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("title", files[0].name.replace(/\.[^.]+$/, ""));
      await uploadClientDocument(fd);
      showMsg("Uploaded successfully");
      await loadDocs();
    } catch (err) {
      showMsg(err.response?.data?.error || "Upload failed", "error");
    } finally { setUploading(false); }
  }

  async function handlePaste() {
    if (!textTitle.trim() || !textContent.trim() || atLimit) return;
    setUploading(true);
    try {
      await addClientTextDocument(textTitle, textContent);
      setTextTitle("");
      setTextContent("");
      showMsg("Text added");
      await loadDocs();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed", "error");
    } finally { setUploading(false); }
  }

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Knowledge Base</h2>
      <p className={styles.tabDesc}>Upload PDFs or paste text. Your widget AI uses only these documents.</p>
      {atLimit && (
        <div className={`${styles.toast} ${styles.toastError}`} style={{ marginBottom: 16 }}>
          Document limit reached ({docLimit}). Upgrade your plan to add more.
        </div>
      )}
      {msg && (
        <div className={`${styles.toast} ${msg.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {msg.text}
        </div>
      )}

      <div className={styles.modeToggle}>
        <button className={`${styles.modeBtn} ${mode === "upload" ? styles.modeActive : ""}`} onClick={() => setMode("upload")}>Upload File</button>
        <button className={`${styles.modeBtn} ${mode === "paste" ? styles.modeActive : ""}`} onClick={() => setMode("paste")}>Paste Text</button>
      </div>

      {mode === "upload" ? (
        <div
          className={`${styles.dropZone} ${uploading ? styles.dropDisabled : ""}`}
          onClick={() => !atLimit && fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
        >
          <input ref={fileRef} type="file" hidden accept=".pdf,.txt,.md,.csv" onChange={(e) => handleFileUpload(e.target.files)} />
          <div className={styles.dropContent}>
            <p>{uploading ? "Uploading…" : "Drop PDF, TXT, MD, or CSV here"}</p>
            <span>Max 20 MB</span>
          </div>
        </div>
      ) : (
        <div className={styles.pasteBox}>
          <input className={styles.pasteTitle} placeholder="Document title" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} />
          <textarea className={styles.pasteText} placeholder="Paste content…" value={textContent} onChange={(e) => setTextContent(e.target.value)} />
          <button className={styles.addBtn} onClick={handlePaste} disabled={uploading || atLimit}>Add to Knowledge Base</button>
        </div>
      )}

      <div className={styles.docSection}>
        <h3>Your Documents ({docs.length})</h3>
        {loading ? <div className={styles.loader}><div className="spinner" /></div> : docs.length === 0 ? (
          <div className={styles.empty}>No documents yet</div>
        ) : (
          <div className={styles.docList}>
            {docs.map((d) => (
              <div key={d._id} className={`${styles.docItem} ${!d.isActive ? styles.docInactive : ""}`}>
                <div className={styles.docInfo}>
                  <span className={styles.docTitle}>{d.title}</span>
                  <span className={styles.docMeta}>{d.fileType} · {new Date(d.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div className={styles.docActions}>
                  <button className={`${styles.toggleDocBtn} ${d.isActive ? styles.activeDoc : styles.inactiveDoc}`} onClick={async () => {
                    await toggleClientDocument(d._id);
                    loadDocs();
                  }}>{d.isActive ? "Active" : "Disabled"}</button>
                  <button className={styles.delBtn} onClick={async () => {
                    if (window.confirm("Delete?")) { await deleteClientDocument(d._id); loadDocs(); }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmbedTab({ stats, client, onSaveSettings }) {
  const [settings, setSettings] = useState({
    chatbotName: "",
    welcomeMessage: "",
    themeColor: "#6c63ff",
    widgetPosition: "bottom-right",
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client?.settings) setSettings({ ...client.settings });
  }, [client]);

  const apiKey = stats?.apiKey || client?.apiKey || "";
  const embedCode = `<script src="${BACKEND_URL}/widget.js" data-api-key="${apiKey}"></script>`;

  function copyCode() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveCustomization() {
    setSaving(true);
    try {
      await onSaveSettings({ settings });
    } finally { setSaving(false); }
  }

  const color = settings.themeColor || "#6c63ff";

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Embed Code</h2>
      <p className={styles.tabDesc}>Add this script before &lt;/body&gt; on your website.</p>

      <div className={styles.settingRow}>
        <pre style={{ background: "var(--bg2)", padding: 16, borderRadius: 10, overflow: "auto", fontSize: 12 }}>{embedCode}</pre>
        <button className={styles.saveBtn} onClick={copyCode}>{copied ? "Copied!" : "Copy to Clipboard"}</button>
      </div>

      <ol style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.8, margin: "20px 0" }}>
        <li>Copy the code above</li>
        <li>Paste before &lt;/body&gt; in your website HTML</li>
        <li>The &quot;Ask AI&quot; button appears on your site</li>
      </ol>

      <h3>Live Preview</h3>
      <div style={{ position: "relative", height: 120, background: "var(--bg3)", borderRadius: 12, marginBottom: 24 }}>
        <button style={{
          position: "absolute",
          bottom: 16,
          [settings.widgetPosition === "bottom-left" ? "left" : "right"]: 16,
          background: color,
          color: "#fff",
          border: "none",
          borderRadius: 50,
          padding: "10px 16px",
          fontWeight: 600,
          fontSize: 13,
          cursor: "default",
        }}>💬 Ask AI</button>
      </div>

      <h3>Customize Widget</h3>
      <div className={styles.settingRow}>
        <label>Chatbot Name</label>
        <input className={styles.settingInput} value={settings.chatbotName} onChange={(e) => setSettings({ ...settings, chatbotName: e.target.value })} />
      </div>
      <div className={styles.settingRow}>
        <label>Welcome Message</label>
        <textarea className={styles.settingTextarea} value={settings.welcomeMessage} onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })} />
      </div>
      <div className={styles.settingRow}>
        <label>Theme Color</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="color" value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} />
          <input className={styles.settingInput} value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} />
        </div>
      </div>
      <div className={styles.settingRow}>
        <label>Widget Position</label>
        <select className={styles.settingInput} value={settings.widgetPosition} onChange={(e) => setSettings({ ...settings, widgetPosition: e.target.value })}>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
        </select>
      </div>
      <button className={styles.saveBtn} onClick={saveCustomization} disabled={saving}>
        {saving ? "Saving…" : "Save Customization"}
      </button>
    </div>
  );
}

function SettingsTab({ client, onRefresh }) {
  const [businessName, setBusinessName] = useState("");
  const [domain, setDomain] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();
  const { logout, refreshClient } = useClientAuth();
  
  // Change email state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1);
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    if (client) {
      setBusinessName(client.businessName || "");
      setDomain(client.domain || "");
    }
  }, [client]);

  async function saveProfile() {
    try {
      await updateClientProfile({ businessName, domain });
      setMsg("Profile updated");
      onRefresh();
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  }

  async function savePassword() {
    try {
      await changeClientPassword(currentPassword, newPassword);
      setMsg("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete account and all data permanently?")) return;
    await deleteClientAccount();
    logout();
    navigate("/client/login");
  }

  async function handleChangeEmailStep1() {
    if (!newEmail || !emailPassword) return;
    setChangingEmail(true);
    try {
      await changeEmail(newEmail, emailPassword);
      setEmailStep(2);
      setEmailPassword("");
      setMsg("OTP sent to new email");
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to send OTP");
    } finally { setChangingEmail(false); }
  }

  async function handleChangeEmailStep2() {
    if (!emailOtp) return;
    setChangingEmail(true);
    try {
      await verifyChangeEmail(emailOtp);
      setShowChangeEmail(false);
      setEmailStep(1);
      setNewEmail("");
      setEmailOtp("");
      await refreshClient();
      setMsg("Email updated successfully");
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to verify OTP");
    } finally { setChangingEmail(false); }
  }

  function resetChangeEmail() {
    setShowChangeEmail(false);
    setEmailStep(1);
    setNewEmail("");
    setEmailPassword("");
    setEmailOtp("");
  }

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>Settings</h2>
      {msg && <div className={`${styles.toast} ${styles.toastSuccess}`}>{msg}</div>}
      <div className={styles.settingRow}>
        <label>Business Name</label>
        <input className={styles.settingInput} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <div className={styles.settingRow}>
        <label>Domain</label>
        <input className={styles.settingInput} value={domain} onChange={(e) => setDomain(e.target.value)} />
      </div>
      <button className={styles.saveBtn} onClick={saveProfile}>Save Profile</button>

      <h3 style={{ marginTop: 32 }}>Change Password</h3>
      <div className={styles.settingRow}>
        <label>Current Password</label>
        <input type="password" className={styles.settingInput} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div className={styles.settingRow}>
        <label>New Password</label>
        <input type="password" className={styles.settingInput} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <button className={styles.saveBtn} onClick={savePassword}>Update Password</button>

      <h3 style={{ marginTop: 32 }}>Change Email</h3>
      <div className={styles.settingRow}>
        <label>Current Email</label>
        <div style={{ padding: "8px 12px", background: "var(--bg3)", borderRadius: 6, fontSize: 14 }}>
          {client?.email}
        </div>
      </div>
      {!showChangeEmail ? (
        <button className={styles.saveBtn} style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }} onClick={() => setShowChangeEmail(true)}>
          Change Email
        </button>
      ) : (
        <div style={{ marginTop: 12 }}>
          {emailStep === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className={styles.settingRow}>
                <label>New Email</label>
                <input type="email" className={styles.settingInput} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className={styles.settingRow}>
                <label>Current Password</label>
                <input type="password" className={styles.settingInput} value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={styles.saveBtn} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)" }} onClick={resetChangeEmail} disabled={changingEmail}>
                  Cancel
                </button>
                <button className={styles.saveBtn} style={{ flex: 1 }} onClick={handleChangeEmailStep1} disabled={changingEmail || !newEmail || !emailPassword}>
                  {changingEmail ? "Sending..." : "Send OTP"}
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
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                maxLength={6}
                style={{ textAlign: "center", letterSpacing: 8, fontSize: 20 }}
                placeholder="Enter OTP"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className={styles.saveBtn} style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border2)" }} onClick={resetChangeEmail} disabled={changingEmail}>
                  Cancel
                </button>
                <button className={styles.saveBtn} style={{ flex: 1 }} onClick={handleChangeEmailStep2} disabled={changingEmail || emailOtp.length !== 6}>
                  {changingEmail ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.recentSection} style={{ marginTop: 40, borderColor: "#ef4444" }}>
        <h3 style={{ color: "#ef4444" }}>Danger Zone</h3>
        <button className={styles.delBtn} onClick={handleDelete}>Delete Account</button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "docs", label: "Knowledge Base" },
  { id: "embed", label: "Embed Code" },
  { id: "settings", label: "Settings" },
];

export default function ClientDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const { client, logout, refreshClient } = useClientAuth();
  const navigate = useNavigate();

  async function loadStats() {
    const res = await getClientStats();
    setStats(res.data);
  }

  useEffect(() => { loadStats(); }, []);

  async function handleSaveSettings(data) {
    await updateClientProfile(data);
    await refreshClient();
    await loadStats();
  }

  function handleLogout() {
    logout();
    navigate("/client/login");
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🏢</div>
            <div>
              <div className={styles.logoName}>{client?.businessName || "Client"}</div>
              <div className={styles.logoEmail}>{client?.email}</div>
            </div>
          </div>
          <nav className={styles.nav}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.navActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className={styles.sidebarBottom}>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className={styles.main}>
        {tab === "overview" && <OverviewTab stats={stats} onRefresh={loadStats} />}
        {tab === "docs" && <KnowledgeTab stats={stats} />}
        {tab === "embed" && <EmbedTab stats={stats} client={client} onSaveSettings={handleSaveSettings} />}
        {tab === "settings" && <SettingsTab client={client} onRefresh={refreshClient} />}
      </main>
    </div>
  );
}

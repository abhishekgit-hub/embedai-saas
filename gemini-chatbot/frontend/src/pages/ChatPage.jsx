import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, getSessions, getSession, deleteSession, getPublicSettings } from "../utils/api";
import styles from "./ChatPage.module.css";

const SUGGESTIONS = [
  "What services do you offer?",
  "Tell me about your admission process",
  "What are your business hours?",
  "How can I contact support?",
];

function TypingDots() {
  return (
    <div className={styles.typingDots}>
      <span /><span /><span />
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : styles.aiRow}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
      )}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        )}
      </div>
      {isUser && <div className={styles.userAvatar}>U</div>}
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [settings, setSettings] = useState({ chatbot_name: "AI Assistant", welcome_message: "Hello! How can I help you today?" });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    loadSessions();
    getPublicSettings().then(r => setSettings(r.data)).catch(() => {});
    
    // Handle window resize to close sidebar on mobile
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      const res = await getSessions();
      setSessions(res.data);
    } catch {}
  }

  async function loadSession(id) {
    try {
      const res = await getSession(id);
      setActiveSession(id);
      setMessages(res.data.messages || []);
    } catch {}
  }

  function newChat() {
    setActiveSession(null);
    setMessages([]);
    inputRef.current?.focus();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendMessage(activeSession, text);
      const { sessionId, response, title } = res.data;

      setActiveSession(sessionId);
      setMessages(prev => [...prev, { role: "assistant", content: response, timestamp: new Date() }]);

      // Update sidebar
      setSessions(prev => {
        const exists = prev.find(s => s.sessionId === sessionId);
        if (exists) {
          return prev.map(s => s.sessionId === sessionId ? { ...s, title, updatedAt: new Date() } : s);
        }
        return [{ sessionId, title, updatedAt: new Date() }, ...prev];
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Error: ${err.response?.data?.error || "Failed to get response"}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.sessionId !== id));
    if (activeSession === id) newChat();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Touch gesture handlers for mobile sidebar
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (!sidebarOpen) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only close on horizontal swipe (left swipe, i.e., negative deltaX)
    // Ignore vertical scrolling (deltaY > deltaX)
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
      setSidebarOpen(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.layout} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Mobile backdrop */}
      <div className={`${styles.backdrop} ${sidebarOpen ? styles.open : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>✦</div>
            <span>{settings.chatbot_name}</span>
          </div>
          <button className={styles.newChatBtn} onClick={newChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
        </div>

        <div className={styles.sessionList}>
          {sessions.length === 0 ? (
            <p className={styles.noSessions}>No conversations yet</p>
          ) : (
            sessions.map(s => (
              <div
                key={s.sessionId}
                className={`${styles.sessionItem} ${activeSession === s.sessionId ? styles.active : ""}`}
                onClick={() => loadSession(s.sessionId)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className={styles.sessionTitle}>{s.title || "New Chat"}</span>
                <button className={styles.deleteBtn} onClick={(e) => handleDelete(e, s.sessionId)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <a href="/client/login" className={styles.panelLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>
            </svg>
            Client Panel
          </a>
          <a href="/admin/login" className={styles.panelLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin Panel
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <button className={styles.toggleBtn} onClick={() => setSidebarOpen(p => !p)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={styles.topbarTitle}>{activeSession ? "Chat" : settings.chatbot_name}</span>
          <div style={{ width: 36 }} />
        </div>

        {/* Messages area */}
        <div className={styles.messages}>
          {isEmpty ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeOrb}>✦</div>
              <h1>{settings.chatbot_name}</h1>
              <p>{settings.welcome_message}</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className={styles.suggestionChip} onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messageList}>
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {loading && (
                <div className={`${styles.messageRow} ${styles.aiRow}`}>
                  <div className={styles.avatar}>✦</div>
                  <div className={`${styles.bubble} ${styles.aiBubble}`}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              rows={1}
              style={{ height: "auto" }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
            />
            <button
              className={`${styles.sendBtn} ${input.trim() && !loading ? styles.active : ""}`}
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <div className="spinner" style={{ width:16, height:16 }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <p className={styles.hint}>Enter to send · Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getWidgetConfig,
  getWidgetConfigByClientId,
  sendWidgetMessage,
} from "../utils/clientApi";
import styles from "./WidgetChat.module.css";

function TypingDots() {
  return (
    <div className={styles.typing}>
      <span /><span /><span />
    </div>
  );
}

export default function WidgetChat() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get("apiKey");

  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const storageKey = `widget_session_${clientId}`;

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) setSessionId(saved);
  }, [storageKey]);

  useEffect(() => {
    async function loadConfig() {
      try {
        let res;
        if (apiKey) {
          res = await getWidgetConfig(apiKey);
        } else {
          res = await getWidgetConfigByClientId(clientId);
        }
        setConfig(res.data);
        setMessages([
          {
            role: "assistant",
            content: res.data.welcomeMessage || "Hello! How can I help you?",
          },
        ]);
      } catch {
        setError("Chatbot unavailable.");
      }
    }
    if (clientId) loadConfig();
  }, [clientId, apiKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading || !config || !apiKey) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await sendWidgetMessage(apiKey, sessionId, userMsg);
      const { sessionId: sid, response } = res.data;
      setSessionId(sid);
      sessionStorage.setItem(storageKey, sid);
      setMessages((m) => [...m, { role: "assistant", content: response }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err.response?.data?.error || "Something went wrong. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return <div className={styles.unavailable}>{error}</div>;
  }

  if (!config) {
    return (
      <div className={styles.unavailable}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const accent = config.themeColor || "#6c63ff";

  return (
    <div className={styles.page} style={{ "--accent": accent }}>
      <header className={styles.header} style={{ borderColor: accent + "33" }}>
        <div className={styles.headerIcon} style={{ background: accent }}>
          ✦
        </div>
        <div>
          <div className={styles.headerTitle}>{config.chatbotName}</div>
          <div className={styles.headerSub}>{config.businessName}</div>
        </div>
      </header>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.row} ${msg.role === "user" ? styles.userRow : styles.aiRow}`}
          >
            {msg.role === "assistant" && (
              <div className={styles.avatar} style={{ background: accent }}>
                AI
              </div>
            )}
            <div
              className={`${styles.bubble} ${
                msg.role === "user" ? styles.userBubble : styles.aiBubble
              }`}
            >
              {msg.role === "user" ? (
                <p>{msg.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className={styles.aiRow}>
            <div className={styles.avatar} style={{ background: accent }}>
              AI
            </div>
            <div className={styles.aiBubble}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputBar} onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ background: accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

(function () {
  "use strict";

  if (window.__acbWidgetLoaded) return;
  window.__acbWidgetLoaded = true;

  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName("script");
    script = scripts[scripts.length - 1];
  }

  var apiKey = script.getAttribute("data-api-key");
  if (!apiKey) {
    console.error("[ACB Widget] Missing data-api-key on script tag.");
    return;
  }

  var backendUrl = script.getAttribute("data-backend-url");
  if (!backendUrl) {
    try {
      var u = new URL(script.src);
      backendUrl = u.origin;
    } catch (e) {
      backendUrl = "http://localhost:5000";
    }
  }

  var widgetBase = script.getAttribute("data-widget-url") || "http://localhost:3000";

  var config = null;
  var isOpen = false;
  var iframe = null;
  var panel = null;
  var btn = null;

  function injectStyles(cfg) {
    var color = (cfg && cfg.themeColor) || "#6c63ff";
    var id = "acb-widget-styles";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      ".acb-widget-btn{position:fixed;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:12px 18px;border:none;border-radius:50px;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 32px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s}" +
      ".acb-widget-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.3)}" +
      ".acb-widget-btn svg{flex-shrink:0}" +
      ".acb-widget-pulse{animation:acb-pulse 2s ease-in-out infinite}" +
      "@keyframes acb-pulse{0%,100%{box-shadow:0 8px 32px rgba(0,0,0,.25),0 0 0 0 " + color + "66}50%{box-shadow:0 8px 32px rgba(0,0,0,.25),0 0 0 12px " + color + "00}}" +
      ".acb-widget-panel{position:fixed;z-index:2147483647;width:380px;height:600px;max-width:calc(100vw - 24px);max-height:calc(100vh - 100px);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);opacity:0;transform:translateY(20px) scale(.96);transition:opacity .25s,transform .25s;background:#fff}" +
      ".acb-widget-panel.acb-open{opacity:1;transform:translateY(0) scale(1)}" +
      ".acb-widget-close{position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;border:none;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
      ".acb-widget-close:hover{background:rgba(0,0,0,.7)}" +
      ".acb-widget-iframe{width:100%;height:100%;border:none;display:block}";
    document.head.appendChild(style);
  }

  function positionElements(cfg) {
    var pos = (cfg && cfg.widgetPosition) || "bottom-right";
    var bottom = "24px";
    var side = pos === "bottom-left" ? { left: "24px" } : { right: "24px" };
    if (btn) {
      btn.style.bottom = bottom;
      btn.style.left = side.left || "auto";
      btn.style.right = side.right || "auto";
      btn.style.background = (cfg && cfg.themeColor) || "#6c63ff";
    }
    if (panel) {
      panel.style.bottom = "96px";
      panel.style.left = side.left || "auto";
      panel.style.right = side.right || "auto";
    }
  }

  function createButton(cfg) {
    btn = document.createElement("button");
    btn.className = "acb-widget-btn acb-widget-pulse";
    btn.setAttribute("aria-label", "Open AI chat");
    btn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "<span>Ask AI</span>";
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);
    positionElements(cfg);
  }

  function createPanel(cfg) {
    panel = document.createElement("div");
    panel.className = "acb-widget-panel";
    panel.style.display = "none";

    var closeBtn = document.createElement("button");
    closeBtn.className = "acb-widget-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", closePanel);

    iframe = document.createElement("iframe");
    iframe.className = "acb-widget-iframe";
    iframe.title = (cfg && cfg.chatbotName) || "AI Chat";
    iframe.src =
      widgetBase.replace(/\/$/, "") +
      "/chat/" +
      encodeURIComponent(cfg.clientId) +
      "?apiKey=" +
      encodeURIComponent(apiKey);

    panel.appendChild(closeBtn);
    panel.appendChild(iframe);
    document.body.appendChild(panel);
    positionElements(cfg);
  }

  function openPanel() {
    if (!panel) return;
    panel.style.display = "block";
    requestAnimationFrame(function () {
      panel.classList.add("acb-open");
    });
    isOpen = true;
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove("acb-open");
    isOpen = false;
    setTimeout(function () {
      if (!isOpen) panel.style.display = "none";
    }, 250);
  }

  function togglePanel() {
    if (isOpen) closePanel();
    else openPanel();
  }

  fetch(backendUrl.replace(/\/$/, "") + "/api/widget/" + encodeURIComponent(apiKey) + "/config")
    .then(function (r) {
      if (!r.ok) throw new Error("Config not found");
      return r.json();
    })
    .then(function (cfg) {
      config = cfg;
      injectStyles(cfg);
      createButton(cfg);
      createPanel(cfg);
    })
    .catch(function (err) {
      console.error("[ACB Widget] Failed to load:", err.message);
    });
})();

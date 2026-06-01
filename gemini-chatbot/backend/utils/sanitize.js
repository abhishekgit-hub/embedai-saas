function sanitizeText(str, maxLen = 50000) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen).replace(/\0/g, "");
}

function validateDomain(domain) {
  if (!domain || typeof domain !== "string") return null;
  const d = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  const re = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return re.test(d) ? d : null;
}

function sanitizeTitle(title, fallback = "Untitled") {
  const t = sanitizeText(title, 200);
  return t || fallback;
}

module.exports = { sanitizeText, sanitizeTitle, validateDomain };

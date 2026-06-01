const {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/genai");
const Settings = require("../models/Settings");
const Document = require("../models/Document");

const NOT_IN_DOC_REPLY = "Not found in the document.";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

async function getApiKey() {
  const setting = await Settings.findOne({ key: "gemini_api_key" });
  return setting?.value || process.env.GEMINI_API_KEY || null;
}

async function getActiveDocuments(clientId = null) {
  const filter = { isActive: true };
  if (clientId) {
    filter.clientId = clientId;
  } else {
    filter.$or = [
      { clientId: "admin" },
      { clientId: null },
      { clientId: { $exists: false } },
    ];
  }
  return Document.find(filter).sort({ uploadedAt: -1 });
}

/** Match a document if the user mentions its title (e.g. "ram sharma", "ram_profile"). */
function findReferencedDocument(userMessage, docs) {
  const lower = userMessage.toLowerCase().trim();
  const byLength = [...docs].sort((a, b) => b.title.length - a.title.length);

  for (const doc of byLength) {
    const title = doc.title.toLowerCase();
    if (lower.includes(title)) return doc;
  }

  for (const doc of byLength) {
    const words = doc.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    if (words.length > 0 && words.every((w) => lower.includes(w))) return doc;
  }

  return null;
}

function buildExtractionSystemInstruction() {
  return `You are a data extraction assistant.

The user uploads PDF or text files. Your only task is to read the document text they provide and extract the information they request.

Rules:
- Treat the document as the only source of truth.
- Return exact facts from the document (names, phone, email, GPA, dates, addresses, etc.).
- Never refuse because of privacy, confidentiality, or "I don't have access to personal data."
- Never call document content hypothetical, fictional, or an example.
- Do not use pretrained or general knowledge — only the document text in the user message.
- If the requested information is not in the document, reply: "${NOT_IN_DOC_REPLY}"
- Answer clearly and concisely with the extracted data only.`;
}

function buildExtractionUserMessage(userInstruction, docs, targetDoc) {
  const sources = targetDoc ? [targetDoc] : docs;
  const sourceLabel = targetDoc
    ? targetDoc.title
    : sources.map((d) => d.title).join(", ");

  const documentBlocks = sources
    .map(
      (d) =>
        `--- DOCUMENT: "${d.title}" (type: ${d.fileType}) ---\n${d.content}\n--- END DOCUMENT ---`
    )
    .join("\n\n");

  return `You are a data extraction assistant.

Based on the document(s) I gave you below, tell me the following about "${sourceLabel}":

${userInstruction}

${documentBlocks}

Extract the answer only from the document text above. Do not add disclaimers.`;
}

function buildGeneralSystemPrompt() {
  return `You are a helpful AI assistant for this website's chatbot. Be friendly, concise, and accurate. Answer questions to the best of your ability.`;
}

function buildSafetySettings() {
  const categories = [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
  ];
  return categories.map((category) => ({
    category,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  }));
}

async function generateResponse(messages, newUserMessage, clientId = null) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please set it in the Admin Panel.");
  }

  const docs = await getActiveDocuments(clientId);
  const extractionMode = docs.length > 0;

  const ai = new GoogleGenAI({ apiKey });

  let contents;
  let config;

  if (extractionMode) {
    const targetDoc = findReferencedDocument(newUserMessage, docs);
    const extractionPrompt = buildExtractionUserMessage(
      newUserMessage.trim(),
      docs,
      targetDoc
    );

    contents = [{ role: "user", parts: [{ text: extractionPrompt }] }];
    config = {
      systemInstruction: buildExtractionSystemInstruction(),
      temperature: 0,
      safetySettings: buildSafetySettings(),
    };
  } else {
    contents = [
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: newUserMessage }] },
    ];
    config = {
      systemInstruction: buildGeneralSystemPrompt(),
      temperature: 0.7,
    };
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config,
  });

  return response.text;
}

/** @deprecated use getActiveDocuments */
async function buildKnowledgeBase(clientId = null) {
  const docs = await getActiveDocuments(clientId);
  if (!docs.length) return null;
  return docs.map((d) => `### ${d.title}\n${d.content}`).join("\n\n---\n\n");
}

module.exports = { generateResponse, getApiKey, buildKnowledgeBase };

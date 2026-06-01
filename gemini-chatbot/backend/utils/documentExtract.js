const fs = require("fs");
const path = require("path");

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  return fs.readFileSync(filePath, "utf-8");
}

module.exports = { extractTextFromFile };

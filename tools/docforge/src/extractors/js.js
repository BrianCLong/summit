const { normalizeComment, summarize } = require('../text');

function extractName(signature) {
  const trimmed = signature.trim();
  let match = trimmed.match(/(?:function|class)\s+([A-Za-z0-9_]+)/);
  if (match) {
    return match[1];
  }
  match = trimmed.match(/const\s+([A-Za-z0-9_]+)\s*=/);
  if (match) {
    return match[1];
  }
  match = trimmed.match(/let\s+([A-Za-z0-9_]+)\s*=/);
  if (match) {
    return match[1];
  }
  match = trimmed.match(/var\s+([A-Za-z0-9_]+)\s*=/);
  if (match) {
    return match[1];
  }
  match = trimmed.match(/export\s+default\s+class\s+([A-Za-z0-9_]+)/);
  if (match) {
    return match[1];
  }
  match = trimmed.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (match) {
    return match[1];
  }
  return trimmed.split(/\s+/)[0] || 'anonymous';
}

function detectKind(signature) {
  const trimmed = signature.trim();
  if (/class\s+/.test(trimmed)) {
    return 'class';
  }
  if (/function\s+/.test(trimmed)) {
    return 'function';
  }
  if (/=>/.test(trimmed)) {
    return 'function';
  }
  return 'member';
}

function extractJsDocs(source) {
  const results = [];
  const pattern = /\/\*\*([\s\S]*?)\*\/\s*([^\/][^\n]*)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const commentRaw = match[1];
    const signatureLine = match[2];
    if (!signatureLine) {
      continue;
    }
    const description = normalizeComment(commentRaw);
    if (!description) {
      continue;
    }
    const name = extractName(signatureLine);
    const kind = detectKind(signatureLine);
    results.push({
      name,
      kind,
      summary: summarize(description),
      description,
      signature: signatureLine.trim(),
    });
  }
  return results;
}

module.exports = {
  extractJsDocs,
};

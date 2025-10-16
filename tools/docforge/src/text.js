function normalizeComment(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, ''))
    .join('\n')
    .trim();
}

function normalizeDocstring(text) {
  const lines = text.split('\n');
  let indent = null;
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const match = line.match(/^\s*/);
    const current = match ? match[0].length : 0;
    if (indent === null || current < indent) {
      indent = current;
    }
  }
  if (!indent) {
    return text.trim();
  }
  return lines
    .map((line) => line.slice(indent))
    .join('\n')
    .trim();
}

function summarize(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  const sentenceEnd = normalized.match(/([.!?])\s/);
  if (!sentenceEnd) {
    return normalized;
  }
  return normalized.slice(0, sentenceEnd.index + 1);
}

module.exports = {
  normalizeComment,
  normalizeDocstring,
  summarize,
};

const { escapeHtml } = require('./fs-utils');

function applyInlineFormatting(text) {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/`(.+?)`/g, '<code>$1</code>');
  return result;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${applyInlineFormatting(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${applyInlineFormatting(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${applyInlineFormatting(line.slice(2))}</h1>`);
      continue;
    }
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${applyInlineFormatting(line.trim().slice(2))}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${applyInlineFormatting(line)}</p>`);
  }

  closeList();
  return html.join('\n');
}

module.exports = {
  markdownToHtml,
};

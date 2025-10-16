const { normalizeDocstring, summarize } = require('../text');

function extractPythonDocs(source) {
  const results = [];
  const lines = source.split('\n');

  function addEntry(kind, name, docstring) {
    const description = normalizeDocstring(docstring);
    if (!description) {
      return;
    }
    results.push({
      name,
      kind,
      summary: summarize(description),
      description,
      signature: kind === 'module' ? name : `${kind} ${name}`,
    });
  }

  // Module docstring detection
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }
    if (/^"""/.test(line) || /^'''/.test(line)) {
      const quote = line.trim().slice(0, 3);
      let content = line.trim().slice(3);
      if (content.endsWith(quote)) {
        content = content.slice(0, -3);
        addEntry('module', 'Module', content);
        break;
      }
      const collected = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const nextLine = lines[j];
        if (nextLine.trim().endsWith(quote)) {
          const withoutEnd = nextLine.slice(0, nextLine.lastIndexOf(quote));
          collected.push(withoutEnd);
          addEntry('module', 'Module', [content, ...collected].join('\n'));
          i = j;
          break;
        }
        collected.push(nextLine);
      }
      break;
    }
    break;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^\s*(def|class)\s+([A-Za-z0-9_]+)/);
    if (!match) {
      continue;
    }
    const kind = match[1] === 'def' ? 'function' : 'class';
    const name = match[2];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') {
      j += 1;
    }
    if (j >= lines.length) {
      continue;
    }
    const docLine = lines[j];
    const docMatch = docLine.match(/^\s*("""|''')([\s\S]*)/);
    if (!docMatch) {
      continue;
    }
    const quote = docMatch[1];
    let content = docMatch[2];
    const collected = [];
    if (content.endsWith(quote)) {
      content = content.slice(0, -3);
      addEntry(kind, name, content);
      i = j;
      continue;
    }
    for (let k = j + 1; k < lines.length; k += 1) {
      const nextLine = lines[k];
      if (nextLine.includes(quote)) {
        const idx = nextLine.indexOf(quote);
        collected.push(nextLine.slice(0, idx));
        addEntry(kind, name, [content, ...collected].join('\n'));
        i = k;
        break;
      }
      collected.push(nextLine);
      if (k === lines.length - 1) {
        addEntry(kind, name, [content, ...collected].join('\n'));
        i = k;
      }
    }
  }

  return results;
}

module.exports = {
  extractPythonDocs,
};

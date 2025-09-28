const { summarize } = require('../text');

function extractGoDocs(source) {
  const results = [];
  const lines = source.split('\n');
  let commentBuffer = [];

  function flushDoc(trimmed, signature) {
    if (commentBuffer.length === 0) {
      return;
    }
    const description = commentBuffer.join('\n').trim();
    commentBuffer = [];
    if (!description) {
      return;
    }
    const nameMatchFunc = signature.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)/);
    const nameMatchType = signature.match(/^type\s+([A-Za-z0-9_]+)/);
    const nameMatchConst = signature.match(/^(?:const|var)\s+([A-Za-z0-9_]+)/);
    let name = 'symbol';
    let kind = 'symbol';
    if (nameMatchFunc) {
      name = nameMatchFunc[1];
      kind = 'function';
    } else if (nameMatchType) {
      name = nameMatchType[1];
      kind = 'type';
    } else if (nameMatchConst) {
      name = nameMatchConst[1];
      kind = 'variable';
    }
    results.push({
      name,
      kind,
      summary: summarize(description),
      description,
      signature: signature.trim()
    });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      commentBuffer.push(trimmed.replace(/^\/\//, '').trim());
      continue;
    }
    if (trimmed.startsWith('func ') || trimmed.startsWith('type ') || trimmed.startsWith('const ') || trimmed.startsWith('var ')) {
      flushDoc(trimmed, trimmed);
    } else {
      commentBuffer = [];
    }
  }

  return results;
}

module.exports = {
  extractGoDocs
};

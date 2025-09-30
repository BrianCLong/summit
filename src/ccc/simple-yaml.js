function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return '';
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const num = Number(trimmed);
  if (!Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return num;
  }
  return trimmed;
}

export function parseSimpleYaml(content) {
  const lines = content.split(/\r?\n/);
  const root = { type: 'object', value: {}, indent: -1 };
  const stack = [root];

  function peekNextNonEmpty(startIndex) {
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const candidate = lines[i].trim();
      if (!candidate.length || candidate.startsWith('#')) {
        continue;
      }
      return candidate;
    }
    return '';
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      continue;
    }

    const indentSpaces = rawLine.match(/^ */)?.[0].length ?? 0;
    if (indentSpaces % 2 !== 0) {
      throw new Error(`Invalid indentation on line ${index + 1}`);
    }
    const level = indentSpaces / 2;
    const trimmed = rawLine.trim();

    while (stack.length && level <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];
    if (!current) {
      throw new Error('Invalid YAML structure');
    }

    if (trimmed.startsWith('- ')) {
      if (current.type !== 'array') {
        throw new Error(`Unexpected list item on line ${index + 1}`);
      }
      const rest = trimmed.slice(2).trim();
      let item = {};
      let pushObject = true;
      if (!rest.length) {
        item = {};
      } else if (rest.includes(':')) {
        item = {};
      } else {
        item = parseScalar(rest);
        pushObject = false;
      }
      current.value.push(item);
      if (!pushObject) {
        continue;
      }
      stack.push({ type: 'object', value: item, indent: level });
      if (rest.includes(':')) {
        const [keyPart, valuePartRaw] = rest.split(/:(.*)/);
        const key = keyPart.trim();
        const valuePart = valuePartRaw.trim();
        if (valuePart) {
          item[key] = parseScalar(valuePart);
        } else {
          const next = peekNextNonEmpty(index);
          const container = next.startsWith('- ') ? [] : {};
          item[key] = container;
          stack.push({ type: Array.isArray(container) ? 'array' : 'object', value: container, indent: level + 1 });
        }
      }
      continue;
    }

    if (!trimmed.includes(':')) {
      throw new Error(`Unable to parse line ${index + 1}: ${trimmed}`);
    }

    const [keyPart, valuePartRaw] = trimmed.split(/:(.*)/);
    const key = keyPart.trim();
    const valuePart = valuePartRaw.trim();

    if (valuePart.length === 0) {
      const next = peekNextNonEmpty(index);
      const container = next.startsWith('- ') ? [] : {};
      current.value[key] = container;
      stack.push({ type: Array.isArray(container) ? 'array' : 'object', value: container, indent: level });
    } else {
      current.value[key] = parseScalar(valuePart);
    }
  }

  return root.value;
}

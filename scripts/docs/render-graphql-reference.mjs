#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const typedocPath = path.join(repoRoot, 'docs', 'reference', 'graphql', 'typedoc.json');
const outputPath = path.join(repoRoot, 'docs', 'reference', 'graphql', 'index.md');
const htmlDir = path.join(repoRoot, 'docs', 'reference', 'graphql', '.html');

const typedoc = JSON.parse(readFileSync(typedocPath, 'utf8'));

const lines = [];
lines.push('# GraphQL API Reference', '');
lines.push('> Generated automatically from the GraphQL server sources. Do not edit by hand.', '');

const modules = typedoc.children ?? [];
for (const mod of modules) {
  lines.push(`## Module ${mod.name}`, '');
  if (mod.comment) {
    lines.push(renderComment(mod.comment), '');
  }

  for (const child of mod.children ?? []) {
    if (child.kind === 64) {
      renderFunction(child, lines);
    } else if (child.kind === 32 || child.kind === 256 || child.kind === 1024) {
      renderVariable(child, lines);
    }
  }
}

writeFileSync(outputPath, lines.join('\n').trimEnd() + '\n');

if (existsSync(htmlDir)) {
  rmSync(htmlDir, { recursive: true, force: true });
}

function renderFunction(node, lines) {
  const signature = (node.signatures ?? [])[0];
  lines.push(`### ${node.name}${formatSignature(signature)}`, '');
  if (signature?.comment) {
    lines.push(renderComment(signature.comment), '');
  }

  const params = signature?.parameters ?? [];
  if (params.length > 0) {
    lines.push('**Parameters**', '');
    lines.push('| Name | Type | Description |');
    lines.push('| ---- | ---- | ----------- |');
    for (const param of params) {
      const typeText = formatType(param.type);
      const desc = param.comment ? collapseWhitespace(renderComment(param.comment)) : '';
      lines.push(`| \`${param.name}\` | ${typeText} | ${desc} |`);
    }
    lines.push('');
  }

  const returnText = formatReturn(signature);
  if (returnText) {
    lines.push(`**Returns:** ${returnText}`, '');
  }
}

function renderVariable(node, lines) {
  lines.push(`### ${node.name}`, '');
  if (node.comment) {
    lines.push(renderComment(node.comment), '');
  }

  if (node.type?.type === 'reflection' && node.type.declaration?.children) {
    for (const child of node.type.declaration.children) {
      renderObjectMember(child, lines, node.name);
    }
  }
}

function renderObjectMember(member, lines, parentName, depth = 4) {
  const nestedChildren = member.type?.type === 'reflection' ? member.type.declaration?.children ?? [] : [];
  const signature = (member.signatures ?? member.type?.declaration?.signatures ?? [])[0];
  const hasDetails = Boolean(member.comment || signature?.comment || signature?.parameters?.length || formatReturn(signature) || nestedChildren.length);
  if (!hasDetails) {
    return;
  }

  const heading = '#'.repeat(depth);
  lines.push(`${heading} ${parentName}.${member.name}`, '');

  if (member.comment) {
    lines.push(renderComment(member.comment), '');
  } else if (signature?.comment) {
    lines.push(renderComment(signature.comment), '');
  }

  const params = signature?.parameters ?? [];
  if (params.length > 0) {
    lines.push('**Parameters**', '');
    lines.push('| Name | Type | Description |');
    lines.push('| ---- | ---- | ----------- |');
    for (const param of params) {
      const typeText = formatType(param.type);
      const desc = param.comment ? collapseWhitespace(renderComment(param.comment)) : '';
      lines.push(`| \`${param.name}\` | ${typeText} | ${desc} |`);
    }
    lines.push('');
  }

  const returnText = formatReturn(signature);
  if (returnText) {
    lines.push(`**Returns:** ${returnText}`, '');
  }

  if (nestedChildren.length > 0) {
    for (const nested of member.type.declaration.children) {
      renderObjectMember(nested, lines, `${parentName}.${member.name}`, depth + 1);
    }
  }
}

function renderComment(comment) {
  const parts = comment.summary ?? [];
  const text = parts.map(renderCommentPart).join('').trim();
  return text.replace(/\s+$/u, '');
}

function renderCommentPart(part) {
  switch (part.kind) {
    case 'text':
      return part.text;
    case 'code':
      return `\`${part.text}\``;
    case 'inline-tag': {
      if (part.tag === '@link') {
        const target = part.target?.url ?? '';
        const label = part.text ?? target;
        return `[${label}](${target})`;
      }
      return part.text ?? '';
    }
    case 'softbreak':
      return '\n';
    default:
      return '';
  }
}

function formatSignature(signature) {
  if (!signature) {
    return '()';
  }
  const params = signature.parameters ?? [];
  const paramNames = params.map((param) => param.name).join(', ');
  return `(${paramNames})`;
}

function formatType(type) {
  if (!type) {
    return '`void`';
  }
  switch (type.type) {
    case 'intrinsic':
      return `\`${type.name}\``;
    case 'reference': {
      const args = (type.typeArguments ?? []).map((arg) => stripCode(formatType(arg))).join(', ');
      const suffix = args.length > 0 ? `<${args}>` : '';
      return `\`${type.name}${suffix}\``;
    }
    case 'union':
      return `\`${type.types.map((t) => stripCode(formatType(t))).join(' | ')}\``;
    case 'reflection':
      return '`object`';
    default:
      return '`unknown`';
  }
}

function formatReturn(signature) {
  if (!signature) {
    return '';
  }
  const block = (signature.comment?.blockTags ?? []).find((tag) => tag.tag === '@returns');
  const description = block ? block.content.map(renderCommentPart).join('').trim() : '';
  const typeText = formatType(signature.type);
  if (description) {
    return `${typeText} — ${collapseWhitespace(description)}`;
  }
  return typeText;
}

function collapseWhitespace(text) {
  return text.replace(/\s+/gu, ' ').trim();
}

function stripCode(text) {
  return text.replace(/^`|`$/g, '');
}

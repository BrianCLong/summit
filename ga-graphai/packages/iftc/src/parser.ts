import { AnnotatedFile, FlowEdge, Label, Transform, TransformKind } from './types';

const COMMENT_PREFIXES = ['//', '#', '--'];

interface ParseContext {
  labels: Label[];
  flows: FlowEdge[];
  transforms: Transform[];
}

const SECURITY_LEVELS = new Set(['low', 'medium', 'high']);

function parseOptions(raw: string): Record<string, string> {
  const options: Record<string, string> = {};
  const regex = /(\w+)=((?:"[^"]+"?)|(?:'[^']+'?)|[^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const [, key, value] = match;
    const cleaned = value.replace(/^['"]|['"]$/g, '');
    options[key] = cleaned;
  }
  return options;
}

function toPurposes(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
  );
}

function toTransformKind(value: string | undefined): TransformKind {
  if (value === 'redactor') {
    return 'redactor';
  }
  return 'transform';
}

export function parseAnnotatedFile(filePath: string, content: string): AnnotatedFile {
  const ctx: ParseContext = { labels: [], flows: [], transforms: [] };
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const prefix = COMMENT_PREFIXES.find((candidate) => trimmed.startsWith(candidate));
    if (!prefix) {
      return;
    }
    const directive = trimmed.slice(prefix.length).trim();
    if (!directive.startsWith('@')) {
      return;
    }

    const [head, ...restParts] = directive.slice(1).split(/\s+/);
    const rest = restParts.join(' ');
    switch (head) {
      case 'label': {
        const labelMatch = /(\S+)/.exec(rest);
        if (!labelMatch) {
          return;
        }
        const id = labelMatch[1];
        const options = parseOptions(rest.slice(id.length).trim());
        const security = options.security;
        if (!security || !SECURITY_LEVELS.has(security)) {
          throw new Error(
            `Invalid or missing security level for label ${id} in ${filePath}:${index + 1}`
          );
        }
        const label: Label = {
          id,
          security: security as Label['security'],
          purposes: toPurposes(options.purposes),
          filePath,
          line: index + 1,
        };
        ctx.labels.push(label);
        return;
      }
      case 'flow': {
        const flowMatch = /(\S+)\s*->\s*(\S+)(.*)/.exec(rest);
        if (!flowMatch) {
          return;
        }
        const [, source, target, tail] = flowMatch;
        const options = parseOptions(tail);
        let transform = options.via;
        if (!transform) {
          const viaMatch = /via\s+([^\s]+)/.exec(tail);
          if (viaMatch) {
            transform = viaMatch[1];
          }
        }
        const flow: FlowEdge = {
          source,
          target,
          transform,
          filePath,
          line: index + 1,
        };
        ctx.flows.push(flow);
        return;
      }
      case 'transform': {
        const nameMatch = /(\S+)/.exec(rest);
        if (!nameMatch) {
          return;
        }
        const name = nameMatch[1];
        const options = parseOptions(rest.slice(name.length).trim());
        const kind = toTransformKind(options.kind);
        const transform: Transform = {
          name,
          kind,
          filePath,
          line: index + 1,
        };
        ctx.transforms.push(transform);
        return;
      }
      case 'redactor': {
        const nameMatch = /(\S+)/.exec(rest);
        if (!nameMatch) {
          return;
        }
        const transform: Transform = {
          name: nameMatch[1],
          kind: 'redactor',
          filePath,
          line: index + 1,
        };
        ctx.transforms.push(transform);
        return;
      }
      default:
        return;
    }
  });

  return {
    filePath,
    labels: ctx.labels,
    flows: ctx.flows,
    transforms: ctx.transforms,
  };
}

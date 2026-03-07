import type { FlowDoc } from './types';

function sanitizeLabel(token: string): string {
  return token
    .replace(/[`]/g, "'")
    .replace(/[\r\n]+/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}

function toNodeId(token: string, index: number): string {
  const compact = token.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_');
  return `N${index}_${compact || 'node'}`;
}

export function renderFlowMermaid(flow: FlowDoc): string {
  const labels = new Map<string, string>();
  for (const edge of flow.edges) {
    labels.set(edge.from, sanitizeLabel(edge.from));
    labels.set(edge.to, sanitizeLabel(edge.to));
  }

  const orderedTokens = Array.from(labels.keys()).sort((a, b) => a.localeCompare(b));
  const tokenToNodeId = new Map<string, string>();
  orderedTokens.forEach((token, index) => {
    tokenToNodeId.set(token, toNodeId(token, index + 1));
  });

  const lines: string[] = ['flowchart TD'];
  for (const token of orderedTokens) {
    const nodeId = tokenToNodeId.get(token) as string;
    lines.push(`  ${nodeId}["${labels.get(token)}"]`);
  }

  for (const edge of [...flow.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const from = tokenToNodeId.get(edge.from) as string;
    const to = tokenToNodeId.get(edge.to) as string;
    lines.push(`  ${from} -->|${sanitizeLabel(edge.kind)}| ${to}`);
  }

  return `${lines.join('\n')}\n`;
}

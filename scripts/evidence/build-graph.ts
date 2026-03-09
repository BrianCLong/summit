import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  color?: string;
  shape?: string;
  fillcolor?: string;
  style?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  style?: string;
  color?: string;
}

const nodes = new Map<string, GraphNode>();
const edges: GraphEdge[] = [];

function addNode(node: GraphNode) {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
}

function processEvidenceDir(dirPath: string) {
  // Use a relative path for a more unique ID instead of just basename
  const relativePath = path.relative(ROOT_DIR, dirPath);
  const dirName = path.basename(dirPath);
  // Replace slashes and other non-alphanumeric chars with underscores for valid dot IDs
  const uniqueIdSuffix = relativePath.replace(/[^a-zA-Z0-9]/g, '_');

  // Try to find common artifacts
  const reportPath = path.join(dirPath, 'report.json');
  const metricsPath = path.join(dirPath, 'metrics.json');
  const stampPath = path.join(dirPath, 'stamp.json');
  const tracePath = path.join(dirPath, 'trace.ndjson');

  const hasReport = fs.existsSync(reportPath);
  const hasMetrics = fs.existsSync(metricsPath);
  const hasStamp = fs.existsSync(stampPath);
  const hasTrace = fs.existsSync(tracePath);

  if (!hasReport && !hasMetrics && !hasStamp && !hasTrace) {
    return; // No recognizable artifacts
  }

  const groupId = `group_${uniqueIdSuffix}`;

  // Group Node
  addNode({
    id: groupId,
    label: `Evidence Bundle\\n${dirName}\\n(${relativePath})`,
    type: 'bundle',
    shape: 'folder',
    fillcolor: '#e2e8f0', // slate-200
    style: 'filled'
  });

  let evidenceId = null;

  if (hasReport) {
    try {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      if (data.evidenceId) {
        evidenceId = data.evidenceId;
      }

      const reportId = `report_${uniqueIdSuffix}`;
      addNode({
        id: reportId,
        label: `report.json`,
        type: 'report',
        shape: 'note',
        fillcolor: '#bfdbfe', // blue-200
        style: 'filled'
      });
      edges.push({ from: groupId, to: reportId, style: 'dashed' });
    } catch (e) {
      console.error(`Error reading ${reportPath}`);
    }
  }

  if (hasMetrics) {
    const metricsId = `metrics_${uniqueIdSuffix}`;
    addNode({
      id: metricsId,
      label: `metrics.json`,
      type: 'metrics',
      shape: 'component',
      fillcolor: '#fecaca', // red-200
      style: 'filled'
    });
    edges.push({ from: groupId, to: metricsId, style: 'dashed' });
  }

  if (hasStamp) {
    const stampId = `stamp_${uniqueIdSuffix}`;
    addNode({
      id: stampId,
      label: `stamp.json`,
      type: 'stamp',
      shape: 'tab',
      fillcolor: '#fef08a', // yellow-200
      style: 'filled'
    });
    edges.push({ from: groupId, to: stampId, style: 'dashed' });
  }

  if (hasTrace) {
    const traceId = `trace_${uniqueIdSuffix}`;
    addNode({
      id: traceId,
      label: `trace.ndjson`,
      type: 'trace',
      shape: 'cylinder',
      fillcolor: '#d9f99d', // lime-200
      style: 'filled'
    });
    edges.push({ from: groupId, to: traceId, style: 'dashed' });
  }

  if (evidenceId) {
    const evNodeId = `ev_${evidenceId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    addNode({
      id: evNodeId,
      label: `Evidence ID\\n${evidenceId}`,
      type: 'evidence_id',
      shape: 'hexagon',
      fillcolor: '#c7d2fe', // indigo-200
      style: 'filled,bold'
    });
    edges.push({ from: groupId, to: evNodeId, label: 'identifies', color: '#4f46e5' });
  }
}

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Check if current directory has artifacts
  processEvidenceDir(dir);

  for (const entry of entries) {
    if (entry.isDirectory()) {
      scanDirectory(path.join(dir, entry.name));
    }
  }
}

console.log('Scanning directories for evidence artifacts...');
scanDirectory(path.join(ROOT_DIR, 'summit/evidence'));
scanDirectory(path.join(ROOT_DIR, 'artifacts/ai-evals'));
scanDirectory(path.join(ROOT_DIR, 'artifacts/benchmark')); // Keep benchmark as the prompt mentions "benchmark results"

console.log(`Found ${nodes.size} nodes and ${edges.length} edges.`);

// Generate DOT string
let dotStr = 'digraph EvidenceGraph {\n';
dotStr += '  rankdir=LR;\n';
dotStr += '  node [fontname="Helvetica,Arial,sans-serif", margin=0.2];\n';
dotStr += '  edge [fontname="Helvetica,Arial,sans-serif", fontsize=10];\n';
dotStr += '  bgcolor="#f8fafc";\n\n';

for (const [id, node] of nodes.entries()) {
  const attrs = [];
  attrs.push(`label="${node.label}"`);
  if (node.shape) attrs.push(`shape="${node.shape}"`);
  if (node.style) attrs.push(`style="${node.style}"`);
  if (node.fillcolor) attrs.push(`fillcolor="${node.fillcolor}"`);
  if (node.color) attrs.push(`color="${node.color}"`);

  dotStr += `  "${id}" [${attrs.join(', ')}];\n`;
}

dotStr += '\n';

for (const edge of edges) {
  const attrs = [];
  if (edge.label) attrs.push(`label="${edge.label}"`);
  if (edge.style) attrs.push(`style="${edge.style}"`);
  if (edge.color) attrs.push(`color="${edge.color}"`);

  const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
  dotStr += `  "${edge.from}" -> "${edge.to}"${attrStr};\n`;
}

dotStr += '}\n';

const dotFilePath = path.join(ARTIFACTS_DIR, 'evidence-graph.dot');
const svgFilePath = path.join(ARTIFACTS_DIR, 'evidence-graph.svg');

fs.writeFileSync(dotFilePath, dotStr);
console.log(`Saved DOT file to ${dotFilePath}`);

try {
  execSync(`dot -Tsvg "${dotFilePath}" -o "${svgFilePath}"`);
  console.log(`Generated SVG graph at ${svgFilePath}`);
} catch (e) {
  console.error('Failed to generate SVG. Is GraphViz (dot) installed?');
  console.error(e);
}

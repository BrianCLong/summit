import fs from 'node:fs';
import path from 'node:path';
import { writeJsonFile } from '../../flows/io';
import type { FlowDoc } from '../../flows/types';

interface FlowBundle {
  version: string;
  flows: FlowDoc[];
}

interface FlowsPack {
  version: string;
  generatedFrom: string;
  flowCount: number;
  flows: Array<{
    id: string;
    name: string;
    entrypoints: string[];
    edges: Array<{ from: string; to: string; kind: string; confidence: string }>;
  }>;
}

export function createFlowsPack(flowsOutDir: string, packPath: string): FlowsPack {
  const flowsPath = path.join(flowsOutDir, 'flows.json');
  const bundle = JSON.parse(fs.readFileSync(flowsPath, 'utf8')) as FlowBundle;
  const flows = Array.isArray(bundle.flows) ? bundle.flows : [];

  const pack: FlowsPack = {
    version: 'v1',
    generatedFrom: flowsPath,
    flowCount: flows.length,
    flows: flows
      .map((flow) => ({
        id: flow.id,
        name: flow.name,
        entrypoints: flow.entrypoints
          .flatMap((entry) => [entry.uiPath, entry.httpPath])
          .filter((entrypoint): entrypoint is string => Boolean(entrypoint))
          .sort((a, b) => a.localeCompare(b)),
        edges: [...flow.edges]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((edge) => ({
            from: edge.from,
            to: edge.to,
            kind: edge.kind,
            confidence: edge.confidence,
          })),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };

  writeJsonFile(packPath, pack);
  return pack;
}

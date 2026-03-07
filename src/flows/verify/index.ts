import fs from 'node:fs';
import path from 'node:path';
import { writeJsonFile } from '../io';
import type { FlowDoc } from '../types';
import { findUnmappedEndpoints } from './openapi';
import { findWorkflowMismatches } from './workflows';

interface FlowBundle {
  version: string;
  flows: FlowDoc[];
}

export interface VerifyOptions {
  workspace: string;
  out: string;
}

export interface VerificationResult {
  version: string;
  unmappedEndpoints: Array<{ method: string; path: string; source: string }>;
  unmappedEvents: Array<{ name: string; source: string }>;
  workflowMismatches: Array<{
    workflow: string;
    expectedFinalEvent: string;
    observedFinalEvent: string;
    source: string;
  }>;
}

function loadFlows(outDir: string): FlowDoc[] {
  const flowsPath = path.join(outDir, 'flows.json');
  if (!fs.existsSync(flowsPath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(flowsPath, 'utf8')) as FlowBundle;
  return Array.isArray(parsed.flows) ? parsed.flows : [];
}

function computeUnmappedEvents(workspace: string, flows: FlowDoc[]): Array<{ name: string; source: string }> {
  const mapped = new Set<string>();
  for (const flow of flows) {
    for (const edge of flow.edges) {
      if (edge.kind === 'event') {
        mapped.add(edge.to.replace(/^Event\s+/i, '').trim());
      }
    }
  }

  const unmapped = new Set<string>();
  for (const flow of flows) {
    for (const edge of flow.edges) {
      if (edge.kind !== 'event' || edge.to.trim() === '') {
        continue;
      }

      const candidate = edge.to.replace(/^Event\s+/i, '').trim();
      if (!mapped.has(candidate)) {
        unmapped.add(candidate);
      }
    }
  }

  return [...unmapped]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, source: workspace }));
}

export function verifyFlows(options: VerifyOptions): VerificationResult {
  const workspace = path.resolve(options.workspace);
  const outDir = path.resolve(options.out);
  const flows = loadFlows(outDir);

  const result: VerificationResult = {
    version: 'v1',
    unmappedEndpoints: findUnmappedEndpoints(workspace, flows),
    unmappedEvents: computeUnmappedEvents(workspace, flows),
    workflowMismatches: findWorkflowMismatches(workspace),
  };

  writeJsonFile(path.join(outDir, 'verification.json'), result);
  return result;
}

#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { ContentBoundary } from './contentBoundary.js';
import { judgeRun } from './judge.js';
import { createDefaultBus, runWorkflow } from './toolBus.js';
import { builtInTools } from './tools.js';
import { loadWorkflowSpec } from './workflowSpec.js';

const usage = () => {
  console.log(`Agent Lab CLI
Usage:
  agent-lab run --workflow <path> [--targets <file|csv>] [--lab] [--dry-run]
  agent-lab judge --run <runId>
  agent-lab tools list
  agent-lab workflows validate <path>
`);
};

const argValue = (flag: string) => {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0) {
    return process.argv[idx + 1];
  }
  return undefined;
};

const loadTargets = (input?: string): string[] | undefined => {
  if (!input) return undefined;
  const resolved = path.resolve(input);
  if (fs.existsSync(resolved)) {
    return fs
      .readFileSync(resolved, 'utf-8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return input.split(',').map((t) => t.trim()).filter(Boolean);
};

const artifactsBase = path.join(process.cwd(), 'artifacts', 'agent-lab');

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const command = process.argv[2];

(async () => {
  if (!command) {
    usage();
    return;
  }

  switch (command) {
    case 'run': {
      const workflowPath = argValue('--workflow');
      if (!workflowPath) {
        console.error('--workflow is required');
        process.exit(1);
      }
      const targets = loadTargets(argValue('--targets'));
      const labMode = process.argv.includes('--lab');
      const dryRun = process.argv.includes('--dry-run') || !labMode;
      const runId = argValue('--run-id') ?? crypto.randomUUID();
      const workflow = loadWorkflowSpec(workflowPath);
      const boundary = new ContentBoundary();
      ensureDir(artifactsBase);
      const tools = builtInTools(artifactsBase);
      const { bus, evidence } = createDefaultBus(workflow, runId, boundary, artifactsBase, tools, dryRun, labMode);
      const summary = await runWorkflow({ workflow, bus, evidence, workflowPath, targets });
      const judged = judgeRun(summary);
      evidence.writeJudge(judged.scores, judged.markdown);
      console.log(`Run complete. Evidence stored at ${evidence.runPath}`);
      return;
    }
    case 'judge': {
      const runId = argValue('--run');
      if (!runId) {
        console.error('--run is required');
        process.exit(1);
      }
      const runPath = path.join(artifactsBase, 'runs', runId, 'run.json');
      if (!fs.existsSync(runPath)) {
        console.error(`Run ${runId} not found at ${runPath}`);
        process.exit(1);
      }
      const summary = JSON.parse(fs.readFileSync(runPath, 'utf-8'));
      const evidenceDir = path.dirname(path.dirname(runPath));
      const dummyEvidence = { writeJudge: (judge: any, markdown: string) => {
        fs.writeFileSync(path.join(evidenceDir, 'judge.json'), JSON.stringify(judge));
        fs.writeFileSync(path.join(evidenceDir, 'judge.md'), markdown);
        return {};
      } } as any;
      const judged = judgeRun(summary);
      dummyEvidence.writeJudge(judged.scores, judged.markdown);
      console.log(`Judged run ${runId}`);
      return;
    }
    case 'tools': {
      const tools = builtInTools(artifactsBase);
      if (process.argv[3] === 'list') {
        tools.forEach((tool) => {
          console.log(`${tool.name}@${tool.version} - ${tool.description}`);
        });
        return;
      }
      usage();
      return;
    }
    case 'workflows': {
      if (process.argv[3] === 'validate') {
        const wfPath = process.argv[4];
        if (!wfPath) {
          console.error('Provide a workflow path to validate.');
          process.exit(1);
        }
        const spec = loadWorkflowSpec(wfPath);
        console.log(`Workflow ${spec.name} is valid.`);
        return;
      }
      usage();
      return;
    }
    default:
      usage();
  }
})();

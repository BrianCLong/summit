import fs from 'node:fs';
import path from 'node:path';
import type { GateResult, WorkflowGateConfig } from './types.js';
import { findFilesByGlob } from './walker.js';

const COMMIT_SHA_REGEX = /^[a-f0-9]{40}$/i;

export async function enforceWorkflowGate(rootDir: string, config: WorkflowGateConfig): Promise<GateResult> {
  const files = await findFilesByGlob(rootDir, config.workflowGlobs);
  const details: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const workflow = parseWorkflow(content);
    const workflowName = path.relative(rootDir, file);

    if (config.enforcePinnedActions) {
      const unpinned = findUnpinnedActions(workflow);
      if (unpinned.length) {
        details.push(`${workflowName}: unpinned actions detected -> ${unpinned.join(', ')}`);
      }
    }

    const permissionIssues = evaluatePermissions(workflow, config);
    if (permissionIssues.length) {
      details.push(`${workflowName}: permission issues -> ${permissionIssues.join('; ')}`);
    }
  }

  return {
    gate: 'workflow',
    ok: details.length === 0,
    details: details.length ? details : ['Workflows pinned and minimally permissioned']
  };
}

type ParsedWorkflow = {
  permissions: Record<string, string>;
  uses: string[];
};

function parseWorkflow(content: string): ParsedWorkflow {
  const lines = content.split(/\r?\n/);
  const permissions: Record<string, string> = {};
  const uses: string[] = [];
  let inPermissions = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (/^permissions:\s*$/.test(line)) {
      inPermissions = true;
      continue;
    }

    if (inPermissions) {
      if (!/^\s/.test(rawLine)) {
        inPermissions = false;
      } else {
        const normalized = line.trim();
        const match = normalized.match(/^([\w-]+):\s*(\w+)/);
        if (match) {
          permissions[match[1]] = match[2];
        }
        continue;
      }
    }

    const usesMatch = line.match(/uses:\s*(.+)/);
    if (usesMatch) {
      uses.push(usesMatch[1].trim());
    }
  }

  return { permissions, uses };
}

function findUnpinnedActions(workflow: ParsedWorkflow): string[] {
  return workflow.uses.filter((actionRef) => {
    if (actionRef.startsWith('./') || actionRef.startsWith('../')) return false;
    const [, ref] = actionRef.split('@');
    return !ref || !COMMIT_SHA_REGEX.test(ref);
  });
}

function evaluatePermissions(workflow: ParsedWorkflow, config: WorkflowGateConfig): string[] {
  const required = config.enforceMinimumPermissions;
  const found = workflow.permissions;

  if (!Object.keys(found).length) {
    return ['missing top-level permissions block'];
  }

  const issues: string[] = [];
  Object.entries(required).forEach(([perm, level]) => {
    const provided = found[perm];
    if (!provided) {
      issues.push(`${perm} permission missing`);
    } else if (provided !== level) {
      issues.push(`${perm} permission must be ${level}, found ${provided}`);
    }
  });

  Object.entries(found).forEach(([perm, level]) => {
    if (required[perm as keyof typeof required]) return;
    if (level === 'write') {
      issues.push(`${perm} permission write not allowed`);
    }
  });

  return issues;
}

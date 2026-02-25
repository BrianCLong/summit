export interface PlannerScreen {
  id: string;
  name: string;
}

export interface ImplementationPlannerInput {
  designId: string;
  screens: PlannerScreen[];
  currentStack: string[];
  proposedStack: string[];
  migrationAllowed: boolean;
  approvalToken?: string;
}

export interface ImplementationPlannerResult {
  markdown: string;
  requiresApproval: boolean;
  stackMigration: boolean;
}

function normalizeStack(stack: string[]): string[] {
  return [...new Set(stack.map((entry) => entry.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function toChecklist(items: string[]): string {
  return items.map((item) => `- [ ] ${item}`).join('\n');
}

/**
 * Produces a deterministic implementation plan before any UI redesign application.
 */
export function buildImplementationPlan(
  input: ImplementationPlannerInput,
): ImplementationPlannerResult {
  const currentStack = normalizeStack(input.currentStack);
  const proposedStack = normalizeStack(input.proposedStack);

  const stackMigration =
    currentStack.length !== proposedStack.length ||
    currentStack.some((entry, index) => entry !== proposedStack[index]);

  const requiresApproval = stackMigration && !input.migrationAllowed && !input.approvalToken;

  const screens = [...input.screens]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((screen) => `${screen.id}: ${screen.name}`);

  const markdown = [
    `# Implementation Plan - ${input.designId}`,
    '',
    '## 1) Intake',
    toChecklist([
      'Validate design artifact contract (design.json/screens.json/html/css/report/metrics/stamp).',
      'Confirm evidence ID mapping and feature flag state before write operations.',
    ]),
    '',
    '## 2) Screen Execution Order',
    screens.length > 0 ? screens.map((line) => `- ${line}`).join('\n') : '- No screens declared.',
    '',
    '## 3) Stack Decision',
    `- Current stack: ${currentStack.join(', ') || 'none'}`,
    `- Proposed stack: ${proposedStack.join(', ') || 'none'}`,
    `- Stack migration required: ${stackMigration ? 'yes' : 'no'}`,
    `- Human approval required: ${requiresApproval ? 'yes' : 'no'}`,
    '',
    '## 4) Execution Gates',
    toChecklist([
      'Run CI design artifact verification gate.',
      'Block merge on missing evidence ID, nondeterministic artifacts, or invalid write paths.',
      'Keep rollout behind design-mcp-enabled feature flag (default OFF).',
    ]),
  ].join('\n');

  return {
    markdown,
    requiresApproval,
    stackMigration,
  };
}

export function assertPlannerApproval(input: ImplementationPlannerInput): void {
  const result = buildImplementationPlan(input);
  if (result.requiresApproval) {
    throw new Error('Stack migration requires human approval token before execution.');
  }
}

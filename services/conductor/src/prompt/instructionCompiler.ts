import { BuildTaskSpec } from '../build/schema';

export interface InstructionBundle {
  system: string;
  developer: string;
  user: string;
}

export interface InstructionOptions {
  additionalSystem?: string;
  additionalDeveloper?: string;
  additionalUser?: string;
}

const DEFAULT_SYSTEM = `Enforce MC guardrails. Obey policy tags. Cite evidence. Do not speculate.`;

export function compileInstructions(
  spec: BuildTaskSpec,
  options: InstructionOptions = {},
): InstructionBundle {
  const system = [DEFAULT_SYSTEM, options.additionalSystem]
    .filter(Boolean)
    .join('\n');
  const developer = [buildDeveloperPrompt(spec), options.additionalDeveloper]
    .filter(Boolean)
    .join('\n\n');
  const user = [buildUserPrompt(spec), options.additionalUser]
    .filter(Boolean)
    .join('\n\n');
  return { system, developer, user };
}

function buildDeveloperPrompt(spec: BuildTaskSpec): string {
  const lines: string[] = [];
  lines.push(`Goal: ${spec.goal}`);
  if (spec.nonGoals.length)
    lines.push(`Non-goals: ${spec.nonGoals.join(', ')}`);
  lines.push(
    `Targets: ${spec.targets.map((t) => `${t.repo}${t.module ? `/${t.module}` : ''}${t.job ? ` (${t.job})` : ''}`).join(', ')}`,
  );
  lines.push(
    `Acceptance Criteria: ${spec.acceptanceCriteria.map((ac) => ac.statement).join(' | ')}`,
  );
  lines.push(
    `Constraints: latencyP95=${spec.constraints.latencyP95Ms ?? '-'}ms, budget=$${spec.constraints.budgetUSD ?? '-'}, tokens<=${spec.constraints.contextTokensMax ?? '-'}`,
  );
  lines.push(
    `Policy: retention=${spec.policy.retention}, purpose=${spec.policy.purpose}, license=${spec.policy.licenseClass}, pii=${spec.policy.pii}`,
  );
  return lines.join('\n');
}

function buildUserPrompt(spec: BuildTaskSpec): string {
  const clarifications = spec.clarifyingQuestions?.length
    ? `Clarifications needed: ${spec.clarifyingQuestions.join(' | ')}`
    : `Artifacts provided: ${spec.inputs.length}`;
  return `${clarifications}\nSLA due: ${spec.sla?.due ?? 'unspecified'}`;
}

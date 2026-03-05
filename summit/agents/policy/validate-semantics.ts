export type AgentEnv = 'dev' | 'test' | 'prod';
export type AgentRole = 'builder' | 'governance' | string;

export type SkillRisk = 'low' | 'medium' | 'high';

export interface SkillSpec {
  name: string;
  risk: SkillRisk;
  scopes: string[];
  repo_paths?: string[];
}

export interface PolicyRule {
  id: string;
  effect: 'allow' | 'deny';
  env?: AgentEnv[];
  agent_role?: AgentRole | AgentRole[];
  skills?: string[];
  scopes?: string[];
  annotations?: {
    approvals?: string[];
    [key: string]: unknown;
  };
}

export interface PolicyDocument {
  default?: 'allow' | 'deny';
  rules: PolicyRule[];
}

export interface SemanticError {
  code: string;
  message: string;
  rule_id?: string;
}

export interface SemanticValidationResult {
  ok: boolean;
  errors: SemanticError[];
}

const PROD_ENV: AgentEnv = 'prod';

function normalizeRoles(rule: PolicyRule): AgentRole[] {
  if (!rule.agent_role) {
    return [];
  }
  return Array.isArray(rule.agent_role) ? rule.agent_role : [rule.agent_role];
}

function hasProdEnv(rule: PolicyRule): boolean {
  return Array.isArray(rule.env) && rule.env.includes(PROD_ENV);
}

function approvalsIncludeGovernance(rule: PolicyRule): boolean {
  return rule.annotations?.approvals?.includes('governance') ?? false;
}

function isHighRiskSkill(
  skillName: string,
  skillRegistry: Record<string, SkillSpec>,
): boolean {
  return skillRegistry[skillName]?.risk === 'high';
}

function hasSensitiveScope(scopes: string[] = []): boolean {
  return scopes.some((scope) => scope.includes('secrets'));
}

function hasNetOrFs(scopes: string[] = []): boolean {
  return scopes.includes('net') || scopes.includes('fs');
}

export function validatePolicySemantics(
  policy: PolicyDocument,
  skillRegistry: Record<string, SkillSpec>,
): SemanticValidationResult {
  const errors: SemanticError[] = [];
  const seenRuleIds = new Set<string>();

  if (policy.default !== 'deny') {
    errors.push({
      code: 'DEFAULT_MUST_DENY',
      message: 'Policy default must be "deny".',
    });
  }

  for (const rule of policy.rules ?? []) {
    if (seenRuleIds.has(rule.id)) {
      errors.push({
        code: 'DUPLICATE_RULE_ID',
        message: `Rule id "${rule.id}" must be unique and stable.`,
        rule_id: rule.id,
      });
      continue;
    }
    seenRuleIds.add(rule.id);

    if (rule.effect !== 'allow') {
      continue;
    }

    const roles = normalizeRoles(rule);
    const skills = rule.skills ?? [];
    const scopes = rule.scopes ?? [];

    if (!hasProdEnv(rule)) {
      continue;
    }

    const allowsHighRisk = skills.some((skillName) =>
      isHighRiskSkill(skillName, skillRegistry),
    );

    if (allowsHighRisk) {
      const isGovernanceOnly =
        roles.length > 0 && roles.every((role) => role === 'governance');
      if (!isGovernanceOnly) {
        errors.push({
          code: 'PROD_HIGH_RISK_ROLE',
          message:
            'High-risk skill enabled in prod requires governance role + approvals annotation.',
          rule_id: rule.id,
        });
      }

      const hasWildcardSkill = skills.includes('*');

      if (hasWildcardSkill) {
        errors.push({
          code: 'PROD_HIGH_RISK_SKILL_LIST',
          message:
            'High-risk prod allow rules must include only release.approve or explicitly listed high-risk skills from registry.',
          rule_id: rule.id,
        });
      }

      if (!approvalsIncludeGovernance(rule)) {
        errors.push({
          code: 'PROD_HIGH_RISK_APPROVALS',
          message:
            'High-risk skill enabled in prod requires governance role + approvals annotation.',
          rule_id: rule.id,
        });
      }
    }

    if (roles.includes('builder') && hasSensitiveScope(scopes)) {
      errors.push({
        code: 'BUILDER_PROD_SECRETS_SCOPE',
        message:
          'Builder role cannot be allowed scopes containing "secrets" in prod.',
        rule_id: rule.id,
      });
    }

    if (hasNetOrFs(scopes) && !(roles.length > 0 && roles.every((role) => role === 'governance'))) {
      errors.push({
        code: 'PROD_NET_FS_NON_GOVERNANCE',
        message:
          'No prod rule may allow net/fs scopes unless agent role is governance.',
        rule_id: rule.id,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

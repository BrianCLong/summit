export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type AgentIdentity = {
  agent_id: string;
  owner: string;
  team: string;
  purpose: string;
  data_classification: DataClassification;
  retention_days: number;
};

export type AgentBoundaries = {
  allowed_tools: string[];
  allowed_actions: string[];
};

export type AgentContext = {
  data_classification: DataClassification;
  retention_days: number;
  approved_sources?: string[];
  redaction_hints?: string[];
};

const REQUIRED_IDENTITY_FIELDS: Array<keyof AgentIdentity> = [
  'agent_id',
  'owner',
  'team',
  'purpose',
  'data_classification',
  'retention_days',
];

const REQUIRED_CONTEXT_FIELDS: Array<keyof AgentContext> = [
  'data_classification',
  'retention_days',
];

const MAX_RETENTION_DAYS = 30;

const missingFields = <T extends object>(
  payload: Partial<T>,
  fields: Array<keyof T>,
): Array<keyof T> =>
  fields.filter((field) => payload[field] === undefined);

export function assertAgentIdentity(
  identity: Partial<AgentIdentity>,
): asserts identity is AgentIdentity {
  const missing = missingFields(identity, REQUIRED_IDENTITY_FIELDS);
  if (missing.length > 0) {
    throw new Error(`IBC_MISSING_FIELDS:${missing.join(',')}`);
  }

  if (identity.retention_days > MAX_RETENTION_DAYS) {
    throw new Error(
      `IBC_RETENTION_EXCEEDED:${identity.retention_days}:${MAX_RETENTION_DAYS}`,
    );
  }
}

export function assertBoundaries(
  boundaries: Partial<AgentBoundaries>,
): asserts boundaries is AgentBoundaries {
  const hasTools = Array.isArray(boundaries.allowed_tools);
  const hasActions = Array.isArray(boundaries.allowed_actions);

  if (!hasTools || !hasActions) {
    throw new Error('IBC_BOUNDARIES_MISSING');
  }

  if (boundaries.allowed_tools.length === 0) {
    throw new Error('IBC_BOUNDARIES_EMPTY_TOOLS');
  }

  if (boundaries.allowed_actions.length === 0) {
    throw new Error('IBC_BOUNDARIES_EMPTY_ACTIONS');
  }
}

export function assertContext(
  context: Partial<AgentContext>,
): asserts context is AgentContext {
  const missing = missingFields(context, REQUIRED_CONTEXT_FIELDS);
  if (missing.length > 0) {
    throw new Error(`IBC_CONTEXT_MISSING_FIELDS:${missing.join(',')}`);
  }

  if (context.retention_days > MAX_RETENTION_DAYS) {
    throw new Error(
      `IBC_CONTEXT_RETENTION_EXCEEDED:${context.retention_days}:${MAX_RETENTION_DAYS}`,
    );
  }
}

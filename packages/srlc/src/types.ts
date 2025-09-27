export type ConsistencyScope = 'session' | 'global';

export type DataFormat = 'string' | 'ssn' | 'iban' | 'phone';

export type TransformActionType = 'mask' | 'hash' | 'tokenize' | 'generalize';

export interface BaseAction {
  type: TransformActionType;
}

export interface MaskAction extends BaseAction {
  type: 'mask';
  keep: number;
  char: string;
}

export interface HashAction extends BaseAction {
  type: 'hash';
  algorithm: 'sha256' | 'sha512';
  saltScope: ConsistencyScope;
}

export interface TokenizeAction extends BaseAction {
  type: 'tokenize';
  namespace: string;
  preserveFormat: boolean;
}

export interface GeneralizeAction extends BaseAction {
  type: 'generalize';
  granularity: 'country' | 'region' | 'state' | 'city' | 'none';
}

export type TransformAction = MaskAction | HashAction | TokenizeAction | GeneralizeAction;

export interface FieldRule {
  path: string;
  format: DataFormat;
  transforms: TransformAction[];
  consistency: ConsistencyScope;
  explain?: string;
}

export interface Policy {
  name: string;
  scope: ConsistencyScope;
  fields: FieldRule[];
}

export interface ExplainTrace {
  field: string;
  steps: string[];
}

export interface CompiledTargets {
  sql: string;
  kafka: string;
  typescript: string;
}

export interface CompiledPolicy {
  policy: Policy;
  targets: CompiledTargets;
  explain: ExplainTrace[];
}

export interface ValidationIssue {
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

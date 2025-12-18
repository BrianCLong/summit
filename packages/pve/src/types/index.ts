/**
 * PVE Type Definitions
 *
 * Core types for the Policy Validation Engine.
 *
 * @module pve/types
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Policy Result Types
// -----------------------------------------------------------------------------

export interface PolicyResult {
  /** Policy identifier */
  policy: string;
  /** Whether the policy passed */
  allowed: boolean;
  /** Severity level if failed */
  severity?: PolicySeverity;
  /** Human-readable message */
  message?: string;
  /** Detailed information about the evaluation */
  details?: PolicyDetails;
  /** Suggested fix for the violation */
  fix?: string;
  /** Location in code/config where violation occurred */
  location?: PolicyLocation;
}

export type PolicySeverity = 'error' | 'warning' | 'info';

export interface PolicyDetails {
  /** Rule that was violated */
  rule?: string;
  /** Expected value or pattern */
  expected?: unknown;
  /** Actual value found */
  actual?: unknown;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface PolicyLocation {
  /** File path */
  file?: string;
  /** Line number (1-indexed) */
  line?: number;
  /** Column number (1-indexed) */
  column?: number;
  /** Affected field or property path */
  field?: string;
}

// -----------------------------------------------------------------------------
// Evaluation Context Types
// -----------------------------------------------------------------------------

export interface EvaluationContext {
  /** Type of evaluation being performed */
  type: EvaluationType;
  /** Input data to evaluate */
  input: EvaluationInput;
  /** Optional metadata about the evaluation */
  metadata?: EvaluationMetadata;
}

export type EvaluationType =
  | 'pr_diff'
  | 'schema_drift'
  | 'metadata_invariant'
  | 'agent_output'
  | 'ci_integrity'
  | 'tsconfig_integrity'
  | 'api_surface'
  | 'dependency_audit'
  | 'security_scan'
  | 'custom';

export type EvaluationInput =
  | PRDiffInput
  | SchemaDriftInput
  | MetadataInvariantInput
  | AgentOutputInput
  | CIIntegrityInput
  | TSConfigIntegrityInput
  | APISurfaceInput
  | DependencyAuditInput
  | SecurityScanInput
  | CustomInput;

export interface PRDiffInput {
  type: 'pr_diff';
  /** The PR number */
  prNumber?: number;
  /** Base branch/commit */
  base: string;
  /** Head branch/commit */
  head: string;
  /** Files changed in the PR */
  files: PRFile[];
  /** PR metadata */
  pr?: PRMetadata;
}

export interface PRFile {
  /** File path relative to repo root */
  path: string;
  /** Type of change */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Previous path (for renamed files) */
  previousPath?: string;
  /** Number of additions */
  additions: number;
  /** Number of deletions */
  deletions: number;
  /** Raw diff content */
  patch?: string;
  /** Parsed content (if available) */
  content?: string;
}

export interface PRMetadata {
  title: string;
  body?: string;
  author: string;
  labels?: string[];
  reviewers?: string[];
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaDriftInput {
  type: 'schema_drift';
  /** Schema type being checked */
  schemaType: 'json_schema' | 'typescript' | 'graphql' | 'protobuf' | 'avro';
  /** Previous schema version */
  previous: string | object;
  /** Current schema version */
  current: string | object;
  /** Path to the schema file */
  filePath?: string;
}

export interface MetadataInvariantInput {
  type: 'metadata_invariant';
  /** Entity type being validated */
  entityType: string;
  /** Metadata to validate */
  metadata: Record<string, unknown>;
  /** Required fields */
  requiredFields?: string[];
  /** Custom validation rules */
  rules?: MetadataRule[];
}

export interface MetadataRule {
  field: string;
  rule: 'required' | 'type' | 'pattern' | 'enum' | 'range' | 'custom';
  config: unknown;
}

export interface AgentOutputInput {
  type: 'agent_output';
  /** Agent identifier */
  agentId: string;
  /** Agent type (claude, jules, codex, etc.) */
  agentType: 'claude' | 'jules' | 'codex' | 'custom';
  /** Output content */
  output: AgentOutput;
  /** Task context */
  task?: AgentTask;
}

export interface AgentOutput {
  /** Type of output */
  outputType: 'code' | 'text' | 'structured' | 'mixed';
  /** Files created or modified */
  files?: AgentFile[];
  /** Text response */
  response?: string;
  /** Structured data */
  data?: unknown;
}

export interface AgentFile {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

export interface AgentTask {
  description: string;
  constraints?: string[];
  expectedOutput?: string;
}

export interface CIIntegrityInput {
  type: 'ci_integrity';
  /** CI/CD platform */
  platform: 'github_actions' | 'gitlab_ci' | 'jenkins' | 'circleci' | 'custom';
  /** Workflow/pipeline configuration */
  config: unknown;
  /** Path to the config file */
  filePath: string;
}

export interface TSConfigIntegrityInput {
  type: 'tsconfig_integrity';
  /** TSConfig content */
  config: unknown;
  /** Path to the config file */
  filePath: string;
  /** Expected compiler options */
  expectedOptions?: Record<string, unknown>;
}

export interface APISurfaceInput {
  type: 'api_surface';
  /** API type */
  apiType: 'graphql' | 'rest' | 'grpc' | 'websocket';
  /** Previous API definition */
  previous?: unknown;
  /** Current API definition */
  current: unknown;
  /** Path to the API definition file */
  filePath?: string;
}

export interface DependencyAuditInput {
  type: 'dependency_audit';
  /** Package manifest */
  manifest: PackageManifest;
  /** Lock file content */
  lockFile?: unknown;
  /** Known vulnerabilities to check against */
  vulnerabilities?: Vulnerability[];
}

export interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface Vulnerability {
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  version: string;
  fix?: string;
  cve?: string;
}

export interface SecurityScanInput {
  type: 'security_scan';
  /** Type of security scan */
  scanType: 'secrets' | 'sast' | 'dast' | 'container' | 'custom';
  /** Content to scan */
  content: string | string[];
  /** File paths */
  filePaths?: string[];
}

export interface CustomInput {
  type: 'custom';
  /** Custom policy identifier */
  policyId: string;
  /** Custom input data */
  data: unknown;
}

export interface EvaluationMetadata {
  /** Repository information */
  repo?: RepoMetadata;
  /** User/actor information */
  actor?: ActorMetadata;
  /** Timestamp of evaluation */
  timestamp?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Environment (dev, staging, prod) */
  environment?: string;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  defaultBranch?: string;
  visibility?: 'public' | 'private' | 'internal';
}

export interface ActorMetadata {
  id: string;
  type: 'user' | 'bot' | 'agent';
  name?: string;
}

// -----------------------------------------------------------------------------
// Policy Configuration Types
// -----------------------------------------------------------------------------

export interface PolicyConfig {
  /** Unique policy identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the policy checks */
  description: string;
  /** Evaluation types this policy applies to */
  appliesTo: EvaluationType[];
  /** Severity if violated */
  severity: PolicySeverity;
  /** Whether the policy is enabled */
  enabled: boolean;
  /** Policy-specific configuration */
  config?: Record<string, unknown>;
  /** Tags for categorization */
  tags?: string[];
}

export interface PolicySet {
  /** Unique set identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Policies in this set */
  policies: PolicyConfig[];
  /** Default severity for policies without explicit severity */
  defaultSeverity?: PolicySeverity;
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

export const PolicyResultSchema = z.object({
  policy: z.string(),
  allowed: z.boolean(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  message: z.string().optional(),
  details: z
    .object({
      rule: z.string().optional(),
      expected: z.unknown().optional(),
      actual: z.unknown().optional(),
      context: z.record(z.unknown()).optional(),
    })
    .optional(),
  fix: z.string().optional(),
  location: z
    .object({
      file: z.string().optional(),
      line: z.number().optional(),
      column: z.number().optional(),
      field: z.string().optional(),
    })
    .optional(),
});

export const EvaluationContextSchema = z.object({
  type: z.enum([
    'pr_diff',
    'schema_drift',
    'metadata_invariant',
    'agent_output',
    'ci_integrity',
    'tsconfig_integrity',
    'api_surface',
    'dependency_audit',
    'security_scan',
    'custom',
  ]),
  input: z.unknown(),
  metadata: z
    .object({
      repo: z
        .object({
          owner: z.string(),
          name: z.string(),
          defaultBranch: z.string().optional(),
          visibility: z.enum(['public', 'private', 'internal']).optional(),
        })
        .optional(),
      actor: z
        .object({
          id: z.string(),
          type: z.enum(['user', 'bot', 'agent']),
          name: z.string().optional(),
        })
        .optional(),
      timestamp: z.string().optional(),
      correlationId: z.string().optional(),
      environment: z.string().optional(),
    })
    .optional(),
});

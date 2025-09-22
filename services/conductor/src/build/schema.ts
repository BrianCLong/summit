import Ajv from "ajv";
import { hashObject } from "../provenance/ledger";

export interface EvidenceLink {
  id: string;
  type: "log" | "junit" | "sarif" | "spdx" | "coverage" | "diff" | "adr" | "metric" | "receipt";
  uri: string;
  hash: string;
  description?: string;
}

export interface AcceptanceCriteria {
  id: string;
  statement: string;
  verify: string;
  metric?: string;
  threshold?: number;
  window?: number;
}

export interface BuildTicket {
  ticketId: string;
  tenantId: string;
  title: string;
  body: string;
  artifacts?: EvidenceLink[];
  reportedAt: string;
  priority?: "p0" | "p1" | "p2" | "p3";
  source?: "jira" | "slack" | "email" | "cli" | "web";
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface BuildTargetRef {
  repo: string;
  path?: string;
  module?: string;
  job?: "test" | "lint" | "build" | "scan" | "deploy" | "package" | "release" | "profile";
  branch?: string;
  residency?: string;
}

export interface ConstraintSet {
  latencyP95Ms?: number;
  budgetUSD?: number;
  contextTokensMax?: number;
  cache?: "prefer" | "force" | "disable";
  dataSensitivity?: "low" | "moderate" | "high";
}

export interface PolicySpec {
  purpose: string;
  retention: "short-30d" | "standard-365d" | "extended";
  licenseClass: string;
  pii: boolean;
}

export interface BuildTaskSpec {
  taskId: string;
  tenantId: string;
  title: string;
  goal: string;
  nonGoals: string[];
  targets: BuildTargetRef[];
  inputs: EvidenceLink[];
  constraints: ConstraintSet;
  policy: PolicySpec;
  acceptanceCriteria: AcceptanceCriteria[];
  risks: string[];
  raci: { owner: string; reviewers: string[] };
  sla?: { due: string };
  clarifyingQuestions?: string[];
  language: string;
  provenanceHash: string;
}

export interface NormalizedTicket {
  digest: string;
  language: string;
  ticket: BuildTicket;
  spec: BuildTaskSpec;
  clarifyingQuestions: string[];
}

const ajv = new Ajv({ removeAdditional: true, useDefaults: true });

const evidenceSchema: any = {
  type: "object",
  properties: {
    id: { type: "string" },
    type: {
      type: "string",
      enum: ["log", "junit", "sarif", "spdx", "coverage", "diff", "adr", "metric", "receipt"],
    },
    uri: { type: "string" },
    hash: { type: "string" },
    description: { type: "string", nullable: true },
  },
  required: ["id", "type", "uri", "hash"],
  additionalProperties: false,
};

const buildTicketSchema: any = {
  type: "object",
  properties: {
    ticketId: { type: "string" },
    tenantId: { type: "string" },
    title: { type: "string" },
    body: { type: "string" },
    artifacts: { type: "array", items: evidenceSchema, nullable: true },
    reportedAt: { type: "string" },
    priority: { type: "string", enum: ["p0", "p1", "p2", "p3"], nullable: true },
    source: { type: "string", enum: ["jira", "slack", "email", "cli", "web"], nullable: true },
    labels: { type: "array", items: { type: "string" }, nullable: true },
    metadata: { type: "object", nullable: true },
  },
  required: ["ticketId", "tenantId", "title", "body", "reportedAt"],
  additionalProperties: false,
};

const buildTaskSpecSchema: any = {
  type: "object",
  properties: {
    taskId: { type: "string" },
    tenantId: { type: "string" },
    title: { type: "string" },
    goal: { type: "string" },
    nonGoals: { type: "array", items: { type: "string" } },
    targets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          repo: { type: "string" },
          path: { type: "string", nullable: true },
          module: { type: "string", nullable: true },
          job: {
            type: "string",
            enum: ["test", "lint", "build", "scan", "deploy", "package", "release", "profile"],
            nullable: true,
          },
          branch: { type: "string", nullable: true },
          residency: { type: "string", nullable: true },
        },
        required: ["repo"],
        additionalProperties: false,
      },
    },
    inputs: { type: "array", items: evidenceSchema },
    constraints: {
      type: "object",
      properties: {
        latencyP95Ms: { type: "number", nullable: true },
        budgetUSD: { type: "number", nullable: true },
        contextTokensMax: { type: "number", nullable: true },
        cache: { type: "string", enum: ["prefer", "force", "disable"], nullable: true },
        dataSensitivity: { type: "string", enum: ["low", "moderate", "high"], nullable: true },
      },
      required: [],
      additionalProperties: false,
    },
    policy: {
      type: "object",
      properties: {
        purpose: { type: "string" },
        retention: { type: "string", enum: ["short-30d", "standard-365d", "extended"] },
        licenseClass: { type: "string" },
        pii: { type: "boolean" },
      },
      required: ["purpose", "retention", "licenseClass", "pii"],
      additionalProperties: false,
    },
    acceptanceCriteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          statement: { type: "string" },
          verify: { type: "string" },
          metric: { type: "string", nullable: true },
          threshold: { type: "number", nullable: true },
          window: { type: "number", nullable: true },
        },
        required: ["id", "statement", "verify"],
        additionalProperties: false,
      },
    },
    risks: { type: "array", items: { type: "string" } },
    raci: {
      type: "object",
      properties: {
        owner: { type: "string" },
        reviewers: { type: "array", items: { type: "string" } },
      },
      required: ["owner", "reviewers"],
      additionalProperties: false,
    },
    sla: {
      type: "object",
      properties: {
        due: { type: "string" },
      },
      required: ["due"],
      nullable: true,
      additionalProperties: false,
    },
    clarifyingQuestions: { type: "array", items: { type: "string" }, nullable: true },
    language: { type: "string" },
    provenanceHash: { type: "string" },
  },
  required: [
    "taskId",
    "tenantId",
    "title",
    "goal",
    "nonGoals",
    "targets",
    "inputs",
    "constraints",
    "policy",
    "acceptanceCriteria",
    "risks",
    "raci",
    "language",
    "provenanceHash",
  ],
  additionalProperties: false,
};

const validateTicket = ajv.compile(buildTicketSchema);
const validateSpec = ajv.compile(buildTaskSpecSchema);

export function ensureTicket(input: BuildTicket): BuildTicket {
  if (!validateTicket(input)) {
    throw new Error(`invalid build ticket: ${ajv.errorsText(validateTicket.errors)}`);
  }
  return input;
}

export function ensureTaskSpec(input: BuildTaskSpec): BuildTaskSpec {
  if (!validateSpec(input)) {
    throw new Error(`invalid build task spec: ${ajv.errorsText(validateSpec.errors)}`);
  }
  return input;
}

export function computeTaskSpecHash(spec: BuildTaskSpec): string {
  return hashObject({
    taskId: spec.taskId,
    tenantId: spec.tenantId,
    goal: spec.goal,
    acceptanceCriteria: spec.acceptanceCriteria,
  });
}

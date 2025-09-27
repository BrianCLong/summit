export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonPrimitive[] | { [key: string]: JsonValue };

export type ScalarTypeName =
  | "string"
  | "integer"
  | "float"
  | "number"
  | "boolean"
  | "date"
  | "timestamp";

export interface ScalarTypeRef {
  kind: "scalar";
  name: ScalarTypeName;
  description?: string;
  format?: string;
}

export interface ArrayTypeRef {
  kind: "array";
  description?: string;
  items: TypeRef;
}

export interface ObjectTypeRef {
  kind: "object";
  description?: string;
  fields: Record<string, TypeRef>;
}

export type TypeRef = ScalarTypeRef | ArrayTypeRef | ObjectTypeRef;

export interface FeaturePort {
  name: string;
  description?: string;
  type: TypeRef;
  constraints?: string[];
  optional?: boolean;
}

export type StabilityLevel = "experimental" | "beta" | "stable" | "deprecated";

export interface StabilityGuarantee {
  level: StabilityLevel;
  changePolicy: string;
  supportWindow?: string;
}

export type InvariantStage = "pre" | "post";

export type BinaryOperator =
  | "=="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "+"
  | "-"
  | "*"
  | "/"
  | "in";

export type LogicalOperator = "and" | "or";

export interface RefExpression {
  kind: "ref";
  path: string;
}

export interface ValueExpression {
  kind: "value";
  value: JsonValue;
}

export interface CallExpression {
  kind: "call";
  fn: "len" | "abs" | "ceil" | "floor" | "max" | "min" | "sum" | "avg";
  args: Expression[];
}

export interface BinaryExpression {
  kind: "binary";
  op: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface LogicalExpression {
  kind: "logical";
  op: LogicalOperator;
  expressions: Expression[];
}

export interface NotExpression {
  kind: "not";
  expression: Expression;
}

export type Expression =
  | RefExpression
  | ValueExpression
  | CallExpression
  | BinaryExpression
  | LogicalExpression
  | NotExpression;

export interface TCCInvariant {
  name: string;
  description: string;
  stage: InvariantStage;
  expression: Expression;
  severity?: "error" | "warn";
}

export interface TCCSampleCase {
  name: string;
  description?: string;
  inputs: Record<string, JsonValue>;
  parameters?: Record<string, JsonValue>;
  expectedOutputs?: Record<string, JsonValue>;
  expectFailure?: boolean;
}

export interface TCCTransform {
  id: string;
  name: string;
  version: string;
  description: string;
  category?: string;
  stability: StabilityGuarantee;
  inputs: FeaturePort[];
  outputs: FeaturePort[];
  parameters?: FeaturePort[];
  invariants: TCCInvariant[];
  samples?: TCCSampleCase[];
  metadata?: Record<string, JsonValue>;
}

export interface TransformationCanon {
  canon: string;
  version: string;
  transforms: TCCTransform[];
  metadata?: Record<string, JsonValue>;
}

export interface InvariantEvaluationContext {
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface InvariantFailure {
  stage: InvariantStage;
  invariant: TCCInvariant;
  reason: string;
  counterexample: {
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  };
}

export interface ConformanceResult {
  transformId: string;
  version: string;
  passed: boolean;
  evaluatedCases: number;
  failures: InvariantFailure[];
}

export interface CanonReceipt {
  transformId: string;
  version: string;
  canon: string;
  generatedAt: string;
  passed: boolean;
  signature: string;
  algorithm: "sha256";
}

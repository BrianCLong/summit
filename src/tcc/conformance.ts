import { createHash } from "crypto";
import {
  CanonReceipt,
  ConformanceResult,
  Expression,
  InvariantFailure,
  InvariantStage,
  TCCInvariant,
  TCCTransform,
  TransformationCanon,
  JsonValue,
} from "./types";
import { assertValidTransformationCanon } from "./schema";

export type Implementation = (
  inputs: Record<string, unknown>,
  parameters?: Record<string, unknown>
) => Record<string, unknown>;

type PathToken = string | number;

function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  const regex = /([^\.\[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      tokens.push(match[1]);
    } else if (match[2]) {
      tokens.push(Number(match[2]));
    }
  }
  return tokens;
}

function resolvePath(context: Record<string, unknown>, path: string): unknown {
  const tokens = tokenizePath(path);
  let current: unknown = context;
  for (const token of tokens) {
    if (current == null) {
      return undefined;
    }
    if (typeof token === "number") {
      if (Array.isArray(current)) {
        current = current[token];
      } else {
        return undefined;
      }
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  return current;
}

function ensureIterable(value: unknown): Iterable<unknown> {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Symbol.iterator in (value as object)) {
    return value as Iterable<unknown>;
  }
  throw new TypeError(`Expected iterable for aggregate invariant, received: ${value}`);
}

function sum(values: unknown): number {
  const iterable = ensureIterable(values);
  let total = 0;
  for (const item of iterable) {
    total += Number(item);
  }
  return total;
}

function avg(values: unknown): number {
  const iterable = ensureIterable(values);
  let total = 0;
  let count = 0;
  for (const item of iterable) {
    total += Number(item);
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

function length(value: unknown): number {
  if (value == null) {
    throw new TypeError("Cannot compute length of nullish value");
  }
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length;
  }
  throw new TypeError(`Unsupported value for len(): ${value}`);
}

function includes(collection: unknown, value: unknown): boolean {
  if (typeof collection === "string") {
    return collection.includes(String(value));
  }
  if (Array.isArray(collection)) {
    return collection.includes(value);
  }
  if (collection && typeof collection === "object") {
    return Object.values(collection as Record<string, unknown>).includes(value);
  }
  return false;
}

function evaluateExpression(expression: Expression, context: Record<string, unknown>): unknown {
  switch (expression.kind) {
    case "value":
      return expression.value;
    case "ref":
      return resolvePath(context, expression.path);
    case "call": {
      const args = expression.args.map((arg) => evaluateExpression(arg, context));
      switch (expression.fn) {
        case "len":
          return length(args[0]);
        case "abs":
          return Math.abs(Number(args[0]));
        case "ceil":
          return Math.ceil(Number(args[0]));
        case "floor":
          return Math.floor(Number(args[0]));
        case "max":
          return Math.max(...args.map(Number));
        case "min":
          return Math.min(...args.map(Number));
        case "sum":
          return sum(args[0]);
        case "avg":
          return avg(args[0]);
        default:
          throw new Error(`Unsupported call expression: ${expression.fn}`);
      }
    }
    case "binary": {
      const left = evaluateExpression(expression.left, context);
      const right = evaluateExpression(expression.right, context);
      switch (expression.op) {
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">":
          return Number(left) > Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "<":
          return Number(left) < Number(right);
        case "<=":
          return Number(left) <= Number(right);
        case "+":
          return Number(left) + Number(right);
        case "-":
          return Number(left) - Number(right);
        case "*":
          return Number(left) * Number(right);
        case "/":
          return Number(left) / Number(right);
        case "in":
          return includes(right, left);
        default:
          throw new Error(`Unsupported binary operator: ${expression.op}`);
      }
    }
    case "logical": {
      if (expression.op === "and") {
        return expression.expressions.every((item) => Boolean(evaluateExpression(item, context)));
      }
      return expression.expressions.some((item) => Boolean(evaluateExpression(item, context)));
    }
    case "not":
      return !Boolean(evaluateExpression(expression.expression, context));
    default:
      throw new Error(`Unsupported expression kind: ${(expression as Expression).kind}`);
  }
}

function evaluateInvariant(
  invariant: TCCInvariant,
  stage: InvariantStage,
  context: Record<string, unknown>
): boolean {
  if (invariant.stage !== stage) return true;
  return Boolean(evaluateExpression(invariant.expression, context));
}

function cloneJson(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function recordFailure(
  invariant: TCCInvariant,
  stage: InvariantStage,
  reason: string,
  inputs: Record<string, unknown>,
  outputs?: Record<string, unknown>,
  parameters?: Record<string, unknown>
): InvariantFailure {
  return {
    stage,
    invariant,
    reason,
    counterexample: {
      inputs: cloneJson(inputs) ?? {},
      outputs: cloneJson(outputs),
      parameters: cloneJson(parameters),
    },
  };
}

export function runConformancePack(
  transform: TCCTransform,
  implementation: Implementation
): ConformanceResult {
  const failures: InvariantFailure[] = [];
  let evaluatedCases = 0;

  for (const sample of transform.samples ?? []) {
    evaluatedCases += 1;
    const params = { ...(sample.parameters ?? {}) };
    const contextBase = {
      inputs: sample.inputs,
      parameters: params,
    };

    let expectedViolation = false;
    let preFailed = false;

    for (const invariant of transform.invariants.filter((item) => item.stage === "pre")) {
      const ok = evaluateInvariant(invariant, "pre", contextBase);
      if (!ok) {
        if (sample.expectFailure) {
          expectedViolation = true;
        } else {
          failures.push(recordFailure(invariant, "pre", "Pre-invariant failed", sample.inputs, undefined, params));
        }
        preFailed = true;
      }
    }

    if (preFailed && !sample.expectFailure) {
      continue;
    }

    let outputs: Record<string, unknown> | undefined;
    try {
      outputs = implementation(sample.inputs, params);
    } catch (error) {
      failures.push({
        stage: "post",
        invariant: {
          name: "implementation-error",
          description: "Implementation threw during execution",
          stage: "post",
          expression: { kind: "value", value: true },
        },
        reason: error instanceof Error ? error.message : String(error),
        counterexample: {
          inputs: cloneJson(sample.inputs) ?? {},
          parameters: cloneJson(params),
        },
      });
      continue;
    }

    const context = {
      ...contextBase,
      outputs,
    };

    for (const invariant of transform.invariants.filter((item) => item.stage === "post")) {
      const ok = evaluateInvariant(invariant, "post", context);
      if (!ok) {
        if (sample.expectFailure) {
          expectedViolation = true;
        } else {
          failures.push(recordFailure(invariant, "post", "Post-invariant failed", sample.inputs, outputs, params));
        }
      }
    }

    if (sample.expectedOutputs) {
      const expectedKeys = Object.keys(sample.expectedOutputs);
      for (const key of expectedKeys) {
        const expected = sample.expectedOutputs[key];
        const actual = outputs?.[key];
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          failures.push({
            stage: "post",
            invariant: {
              name: `expected-output::${key}`,
              description: `Output ${key} must match expected sample value`,
              stage: "post",
              expression: { kind: "value", value: expected as JsonValue },
            },
            reason: `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
            counterexample: {
              inputs: cloneJson(sample.inputs) ?? {},
              outputs: cloneJson(outputs),
              parameters: cloneJson(params),
            },
          });
        }
      }
    }

    if (sample.expectFailure && !expectedViolation) {
      failures.push({
        stage: "post",
        invariant: {
          name: "expected-failure",
          description: `Sample ${sample.name} expected to violate an invariant`,
          stage: "post",
          expression: { kind: "value", value: false },
        },
        reason: "Expected failure case passed all invariants.",
        counterexample: {
          inputs: cloneJson(sample.inputs) ?? {},
          outputs: cloneJson(outputs),
          parameters: cloneJson(params),
        },
      });
    }
  }

  return {
    transformId: transform.id,
    version: transform.version,
    passed: failures.length === 0,
    evaluatedCases,
    failures,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
}

export function createCanonReceipt(transform: TCCTransform, result: ConformanceResult): CanonReceipt {
  const canonicalPayload = {
    transformId: transform.id,
    version: transform.version,
    evaluatedCases: result.evaluatedCases,
    passed: result.passed,
    stability: transform.stability,
    invariants: transform.invariants.map((invariant) => ({
      name: invariant.name,
      stage: invariant.stage,
      severity: invariant.severity ?? "error",
    })),
    samples: (transform.samples ?? []).map((sample) => ({
      name: sample.name,
      expectFailure: sample.expectFailure ?? false,
    })),
    failures: result.failures.map((failure) => ({
      stage: failure.stage,
      invariant: failure.invariant.name,
      reason: failure.reason,
      counterexample: failure.counterexample,
    })),
  };

  const canon = stableStringify(canonicalPayload);
  const signature = createHash("sha256").update(canon).digest("hex");

  return {
    transformId: transform.id,
    version: transform.version,
    canon,
    generatedAt: new Date().toISOString(),
    passed: result.passed,
    signature,
    algorithm: "sha256",
  };
}

export function loadAndValidateCanon(document: TransformationCanon): TransformationCanon {
  assertValidTransformationCanon(document);
  return document;
}

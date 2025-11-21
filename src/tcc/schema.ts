import {
  Expression,
  FeaturePort,
  TCCInvariant,
  TCCSampleCase,
  TCCTransform,
  TransformationCanon,
  TypeRef,
} from "./types";

interface ValidationContext {
  path: string[];
  errors: string[];
}

function pushError(ctx: ValidationContext, message: string): void {
  ctx.errors.push(`${ctx.path.join(".") || "root"}: ${message}`);
}

function withPath<T>(ctx: ValidationContext, segment: string, fn: () => T): T {
  ctx.path.push(segment);
  try {
    return fn();
  } finally {
    ctx.path.pop();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTypeRef(value: unknown, ctx: ValidationContext): value is TypeRef {
  if (!isRecord(value)) {
    pushError(ctx, "type definition must be an object");
    return false;
  }
  if (typeof value.kind !== "string") {
    pushError(ctx, "missing kind for type definition");
    return false;
  }
  switch (value.kind) {
    case "scalar": {
      const name = value.name;
      const allowed = ["string", "integer", "float", "number", "boolean", "date", "timestamp"];
      if (typeof name !== "string" || !allowed.includes(name)) {
        pushError(ctx, `invalid scalar name: ${String(name)}`);
        return false;
      }
      return true;
    }
    case "array": {
      return withPath(ctx, "items", () => validateTypeRef((value as { items?: unknown }).items, ctx));
    }
    case "object": {
      if (!isRecord(value.fields)) {
        pushError(ctx, "object type requires fields map");
        return false;
      }
      for (const [key, field] of Object.entries(value.fields)) {
        withPath(ctx, `fields.${key}`, () => validateTypeRef(field, ctx));
      }
      return true;
    }
    default:
      pushError(ctx, `unknown type kind: ${value.kind}`);
      return false;
  }
}

function validateExpression(expression: unknown, ctx: ValidationContext): expression is Expression {
  if (!isRecord(expression) || typeof expression.kind !== "string") {
    pushError(ctx, "expression must declare a kind");
    return false;
  }
  switch (expression.kind) {
    case "ref":
      if (typeof expression.path !== "string" || !expression.path) {
        pushError(ctx, "ref expression requires a non-empty path");
        return false;
      }
      return true;
    case "value":
      return "value" in expression;
    case "call":
      if (!Array.isArray(expression.args) || expression.args.length === 0) {
        pushError(ctx, "call expression requires args");
        return false;
      }
      if (!["len", "abs", "ceil", "floor", "max", "min", "sum", "avg"].includes(expression.fn as string)) {
        pushError(ctx, `unsupported call function: ${String(expression.fn)}`);
        return false;
      }
      expression.args.forEach((arg, index) => withPath(ctx, `args[${index}]`, () => validateExpression(arg, ctx)));
      return true;
    case "binary": {
      const allowed = ["==", "!=", ">", ">=", "<", "<=", "+", "-", "*", "/", "in"];
      if (!allowed.includes(expression.op as string)) {
        pushError(ctx, `invalid binary operator: ${String(expression.op)}`);
      }
      withPath(ctx, "left", () => validateExpression(expression.left, ctx));
      withPath(ctx, "right", () => validateExpression(expression.right, ctx));
      return true;
    }
    case "logical":
      if (!Array.isArray(expression.expressions) || expression.expressions.length < 2) {
        pushError(ctx, "logical expression requires at least two operands");
        return false;
      }
      if (!["and", "or"].includes(expression.op as string)) {
        pushError(ctx, `invalid logical operator: ${String(expression.op)}`);
        return false;
      }
      expression.expressions.forEach((child, index) => withPath(ctx, `expressions[${index}]`, () => validateExpression(child, ctx)));
      return true;
    case "not":
      return withPath(ctx, "expression", () => validateExpression(expression.expression, ctx));
    default:
      pushError(ctx, `unsupported expression kind: ${expression.kind}`);
      return false;
  }
}

function validatePort(port: unknown, ctx: ValidationContext): port is FeaturePort {
  if (!isRecord(port)) {
    pushError(ctx, "port definition must be an object");
    return false;
  }
  if (typeof port.name !== "string" || !port.name) {
    pushError(ctx, "port requires a name");
  }
  withPath(ctx, "type", () => validateTypeRef(port.type, ctx));
  return true;
}

function validateInvariant(invariant: unknown, ctx: ValidationContext): invariant is TCCInvariant {
  if (!isRecord(invariant)) {
    pushError(ctx, "invariant must be an object");
    return false;
  }
  if (typeof invariant.name !== "string" || !invariant.name) {
    pushError(ctx, "invariant requires a name");
  }
  if (typeof invariant.description !== "string" || !invariant.description) {
    pushError(ctx, "invariant requires a description");
  }
  if (invariant.stage !== "pre" && invariant.stage !== "post") {
    pushError(ctx, "invariant stage must be pre or post");
  }
  withPath(ctx, "expression", () => validateExpression(invariant.expression, ctx));
  return true;
}

function validateSample(sample: unknown, ctx: ValidationContext): sample is TCCSampleCase {
  if (!isRecord(sample)) {
    pushError(ctx, "sample must be an object");
    return false;
  }
  if (typeof sample.name !== "string" || !sample.name) {
    pushError(ctx, "sample requires a name");
  }
  if (!isRecord(sample.inputs)) {
    pushError(ctx, "sample inputs must be an object");
  }
  return true;
}

function validateTransform(transform: unknown, ctx: ValidationContext): transform is TCCTransform {
  if (!isRecord(transform)) {
    pushError(ctx, "transform must be an object");
    return false;
  }
  const required = ["id", "name", "version", "description"] as const;
  for (const field of required) {
    if (typeof transform[field] !== "string" || !transform[field]) {
      pushError(ctx, `transform requires ${field}`);
    }
  }
  if (!isRecord(transform.stability)) {
    pushError(ctx, "transform requires stability metadata");
  } else {
    const level = transform.stability.level;
    const allowedLevels = ["experimental", "beta", "stable", "deprecated"];
    if (!allowedLevels.includes(level)) {
      pushError(ctx, `invalid stability level: ${String(level)}`);
    }
    if (typeof transform.stability.changePolicy !== "string" || !transform.stability.changePolicy) {
      pushError(ctx, "stability.changePolicy is required");
    }
  }
  if (!Array.isArray(transform.inputs) || transform.inputs.length === 0) {
    pushError(ctx, "transform requires at least one input");
  } else {
    transform.inputs.forEach((port, index) => withPath(ctx, `inputs[${index}]`, () => validatePort(port, ctx)));
  }
  if (!Array.isArray(transform.outputs) || transform.outputs.length === 0) {
    pushError(ctx, "transform requires at least one output");
  } else {
    transform.outputs.forEach((port, index) => withPath(ctx, `outputs[${index}]`, () => validatePort(port, ctx)));
  }
  if (!Array.isArray(transform.invariants) || transform.invariants.length === 0) {
    pushError(ctx, "transform requires invariants");
  } else {
    transform.invariants.forEach((invariant, index) =>
      withPath(ctx, `invariants[${index}]`, () => validateInvariant(invariant, ctx))
    );
  }
  if (transform.samples) {
    if (!Array.isArray(transform.samples)) {
      pushError(ctx, "samples must be an array when provided");
    } else {
      transform.samples.forEach((sample, index) => withPath(ctx, `samples[${index}]`, () => validateSample(sample, ctx)));
    }
  }
  return true;
}

export interface CanonValidation {
  valid: boolean;
  errors: string[];
}

export function validateTransformationCanon(document: unknown): CanonValidation {
  const ctx: ValidationContext = { path: [], errors: [] };
  if (!isRecord(document)) {
    return { valid: false, errors: ["root: document must be an object"] };
  }
  if (typeof document.canon !== "string" || !document.canon) {
    pushError(ctx, "canon identifier is required");
  }
  if (typeof document.version !== "string" || !document.version) {
    pushError(ctx, "canon version is required");
  }
  if (!Array.isArray(document.transforms) || document.transforms.length === 0) {
    pushError(ctx, "canon requires at least one transform");
  } else {
    document.transforms.forEach((transform, index) =>
      withPath(ctx, `transforms[${index}]`, () => validateTransform(transform, ctx))
    );
  }
  return { valid: ctx.errors.length === 0, errors: ctx.errors };
}

export function assertValidTransformationCanon(document: unknown): asserts document is TransformationCanon {
  const result = validateTransformationCanon(document);
  if (!result.valid) {
    throw new Error(`TCC schema validation failed: ${result.errors.join(", ")}`);
  }
}

export const transformationCanonSchema = undefined;

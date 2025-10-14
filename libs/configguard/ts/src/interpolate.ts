import type { Diagnostic, InterpolationPolicy, Position } from './types';

const VAR_PATTERN = /\$\{([A-Z0-9_]+)(?::-(.*?))?\}/g;

export interface InterpolationContext {
  policy: InterpolationPolicy;
  pointerMap: Record<string, Position>;
}

export function interpolateConfig<T>(
  value: T,
  pointer: string,
  ctx: InterpolationContext,
  diags: Diagnostic[]
): T {
  if (value === null || typeof value !== 'object') {
    return interpolateScalar(value, pointer, ctx, diags);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      interpolateConfig(item, `${pointer}/${index}`, ctx, diags)
    ) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const escapedKey = escapeJsonPointerSegment(key);
    result[key] = interpolateConfig(
      child,
      pointer ? `${pointer}/${escapedKey}` : `/${escapedKey}`,
      ctx,
      diags
    );
  }

  return result as T;
}

function interpolateScalar<T>(
  value: T,
  pointer: string,
  ctx: InterpolationContext,
  diags: Diagnostic[]
): T {
  if (typeof value !== 'string') {
    return value;
  }

  let updated = value;
  let match: RegExpExecArray | null;
  const seen: Set<string> = new Set();
  VAR_PATTERN.lastIndex = 0;

  while ((match = VAR_PATTERN.exec(value))) {
    const [, name, fallback] = match;
    seen.add(name);

    if (ctx.policy.denyList?.includes(name)) {
      diags.push(createDiagnostic('error', pointer, ctx.pointerMap, `Environment variable "${name}" is blocked by policy.`));
      continue;
    }

    if (ctx.policy.requireAllowList && !ctx.policy.allowList?.includes(name)) {
      diags.push(createDiagnostic('error', pointer, ctx.pointerMap, `Environment variable "${name}" is not allowed. Add it to the allow list.`));
      continue;
    }

    const provided = process.env[name];
    let replacement: string | undefined = provided;

    if (replacement === undefined) {
      if (ctx.policy.defaults && name in ctx.policy.defaults) {
        replacement = ctx.policy.defaults[name];
      } else if (fallback !== undefined) {
        replacement = fallback;
      }
    }

    if (replacement === undefined) {
      const severity = ctx.policy.onMissing ?? 'warn';
      diags.push(
        createDiagnostic(
          severity,
          pointer,
          ctx.pointerMap,
          `Missing environment variable "${name}" for interpolation.`,
          severity === 'warn' ? 'define the variable or supply a default' : undefined
        )
      );
      continue;
    }

    updated = updated.replace(match[0], replacement);
  }

  if (ctx.policy.allowList && ctx.policy.allowList.length) {
    for (const allowed of ctx.policy.allowList) {
      if (seen.has(allowed)) {
        continue;
      }
    }
  }

  return updated as unknown as T;
}

function createDiagnostic(
  severity: 'error' | 'warning',
  pointer: string,
  pointerMap: Record<string, Position>,
  message: string,
  hint?: string
): Diagnostic {
  const pos = pointerMap[pointer] ?? pointerMap[''] ?? { line: 0, column: 0 };
  return {
    severity,
    message,
    pointer,
    line: pos.line,
    column: pos.column,
    hint
  };
}

export function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

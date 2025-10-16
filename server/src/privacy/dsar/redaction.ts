const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

export interface RedactionRule {
  connector: string;
  description: string;
  apply(input: unknown): unknown;
}

export interface RedactionOutcome<T = unknown> {
  data: T;
  applied: string[];
}

const maskValue = (value: unknown, mask: string): unknown => {
  if (typeof value === 'string' && value.length > mask.length) {
    return `${mask}${value.slice(mask.length)}`;
  }
  return mask;
};

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

type TraverseCallback = (args: {
  key: string;
  value: unknown;
  parent: Record<string, unknown> | unknown[];
}) => void;

const traverse = (value: unknown, cb: TraverseCallback): void => {
  if (Array.isArray(value)) {
    value.forEach((item, idx, arr) => {
      cb({ key: String(idx), value: item, parent: arr });
      traverse(item, cb);
    });
    return;
  }
  if (isPlainObject(value)) {
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      cb({ key, value: val, parent: value as Record<string, unknown> });
      traverse(val, cb);
    });
  }
};

export const applyConnectorRedactions = <T = unknown>(
  connector: string,
  input: T,
  rules: RedactionRule[] | undefined,
): RedactionOutcome<T> => {
  if (!rules?.length) {
    return { data: input, applied: [] };
  }
  const applicable = rules.filter((rule) => rule.connector === connector);
  if (!applicable.length) {
    return { data: input, applied: [] };
  }
  let working: unknown = clone(input);
  const applied: string[] = [];
  for (const rule of applicable) {
    working = rule.apply(clone(working));
    applied.push(rule.description);
  }
  return { data: working as T, applied };
};

export const createFieldMaskRule = (
  connector: string,
  fields: string[],
  mask = '[REDACTED]',
  description = 'Mask sensitive fields',
): RedactionRule => ({
  connector,
  description,
  apply: (input: unknown) => {
    const result = clone(input) as Record<string, unknown>;
    const fieldSet = new Set(fields);
    traverse(result, ({ key, value, parent }) => {
      if (fieldSet.has(key)) {
        if (Array.isArray(parent)) {
          (parent as unknown[])[Number(key)] = maskValue(value, mask);
        } else if (isPlainObject(parent)) {
          (parent as Record<string, unknown>)[key] = maskValue(value, mask);
        }
      }
    });
    return result;
  },
});

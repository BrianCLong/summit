import { createHash } from 'node:crypto';

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
};

export const stableJsonStringify = (obj: unknown): string => JSON.stringify(sortValue(obj));

export const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

export const hashInputs = (inputs: AgentTaskInput): string =>
  sha256(stableJsonStringify(inputs));

export const hashOutputs = (outputs: AgentTaskOutput): string =>
  sha256(stableJsonStringify(outputs));

type AgentTaskInput = Record<string, unknown> | undefined;
type AgentTaskOutput = Record<string, unknown> | undefined;

/// <reference types="node" />
import { createHash, randomUUID } from 'crypto';

const DEFAULT_NAMESPACE = 'summit.durable-work';

const formatUuidFromHash = (hash: string): string => {
  const normalized = hash.toLowerCase();
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-5${normalized.slice(13, 16)}-a${normalized.slice(17, 20)}-${normalized.slice(20, 32)}`;
};

export const makeDeterministicId = (
  seed: string,
  namespace: string = DEFAULT_NAMESPACE,
): string => {
  const hash = createHash('sha256')
    .update(`${namespace}:${seed}`)
    .digest('hex');

  return formatUuidFromHash(hash);
};

export const makeEphemeralId = (): string => randomUUID();

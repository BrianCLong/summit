import { createHash } from 'node:crypto';
import type { MigrationDefinition } from './types.js';

export function computeChecksum(definition: MigrationDefinition): string {
  if (definition.checksum) {
    return definition.checksum;
  }
  const hash = createHash('sha256');
  hash.update(definition.id);
  hash.update(definition.version ?? '');
  hash.update(definition.title ?? '');
  hash.update(definition.up.toString());
  hash.update(definition.down.toString());
  if (definition.dependencies) {
    hash.update(JSON.stringify([...definition.dependencies].sort()));
  }
  return hash.digest('hex');
}

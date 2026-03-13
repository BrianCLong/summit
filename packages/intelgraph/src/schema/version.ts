export type SchemaVersion = '1' | '2';
export const CURRENT_SCHEMA_VERSION: SchemaVersion = '2';

export function needsMigration(version: SchemaVersion): boolean {
  return version !== CURRENT_SCHEMA_VERSION;
}

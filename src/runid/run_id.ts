import { v7 as uuidv7, validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * Generates a new UUIDv7 for a run.
 * UUIDv7 is time-ordered and recommended for OpenLineage runIds.
 */
export const generateRunId = (): string => {
  return uuidv7();
};

/**
 * Checks if the provided ID is a valid UUIDv7.
 */
export const isValidRunIdv7 = (id: string): boolean => {
  return uuidValidate(id) && uuidVersion(id) === 7;
};

/**
 * Checks if the provided ID is a valid UUID (any version).
 */
export const isValidUuid = (id: string): boolean => {
  return uuidValidate(id);
};

import { v7 as uuidv7 } from 'uuid';

/**
 * Generates a canonical OpenLineage runId using UUIDv7.
 * UUIDv7 is recommended by OpenLineage for its time-ordered properties.
 */
export const generateRunId = (): string => {
  return uuidv7();
};

/**
 * Generates a canonical Run URI string for a given runId.
 * Format: openlineage://<tenant>/<namespace>/<job>/runs/<runId>
 */
export const generateRunUri = (params: {
  tenant: string;
  namespace: string;
  job: string;
  runId: string;
}): string => {
  const { tenant, namespace, job, runId } = params;
  return `openlineage://${tenant}/${namespace}/${job}/runs/${runId}`;
};

import { isValidUuid } from './run_id';

/**
 * Generates a provenance subject URI for a run.
 * Format: openlineage://<namespace>/runs/<runId>
 */
export const openLineageRunSubject = (namespace: string, runId: string): string => {
  if (!namespace) {
    throw new Error('Namespace is required');
  }
  if (!isValidUuid(runId)) {
    throw new Error(`Invalid runId: ${runId}. Must be a UUID.`);
  }
  // URL encoding for namespace if needed, though strictly it should be a clean slug
  const encodedNamespace = encodeURIComponent(namespace);
  return `openlineage://${encodedNamespace}/runs/${runId}`;
};

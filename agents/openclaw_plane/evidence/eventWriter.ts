export function createEventPayload(runId: string, seq: number, eventData: any) {
  const { nextEvidenceId } = require('./evidenceIds');
  return {
    eventId: nextEvidenceId(runId, seq),
    runId,
    timestamp: 'fixed-for-determinism',
    data: eventData
  };
}

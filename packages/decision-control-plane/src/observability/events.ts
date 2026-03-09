export function emitDecisionEvent(
  decisionId: string,
  eventType: string,
  payload: Record<string, any>
) {
  // Mock event emission
  return { decisionId, eventType, payload };
}

export function generateEventId(): string {
  // Use crypto API or uuid in actual implementation
  return 'event-' + Math.random().toString(36).substr(2, 9);
}

export function generateDecisionId(): string {
  return 'dec-' + Math.random().toString(36).substr(2, 9);
}

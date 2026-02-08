// Deterministic state machine
export function deriveState(scores: { seeding: number, handoff: number, compression: number }): string {
  if (scores.handoff > 0.8) return 'Institutionalized';
  if (scores.seeding > 0.7) return 'Seeded';
  if (scores.compression > 0.6) return 'Normalized';
  return 'Contested';
}

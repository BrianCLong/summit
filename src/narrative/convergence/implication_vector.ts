export type Vector = number[];

// Dimensions: [Trust(1)/Distrust(-1), Urgent(1)/Calm(-1),  Unified(1)/Fragmented(-1)]
const DIMENSIONS = 3;

export function getImplicationVector(text: string): Vector {
  const vector = [0, 0, 0];
  const lower = text.toLowerCase();

  // Dimension 0: Trust vs Distrust
  if (lower.includes('trust') || lower.includes('believe')) vector[0] += 1;
  if (lower.includes('fraud') || lower.includes('fake') || lower.includes('lie')) vector[0] -= 1;

  // Dimension 1: Urgent vs Calm
  if (lower.includes('now') || lower.includes('crisis') || lower.includes('emergency')) vector[1] += 1;
  if (lower.includes('wait') || lower.includes('safe') || lower.includes('calm')) vector[1] -= 1;

  // Dimension 2: Unified vs Fragmented
  if (lower.includes('together') || lower.includes('us') || lower.includes('we')) vector[2] += 1;
  if (lower.includes('they') || lower.includes('them') || lower.includes('split')) vector[2] -= 1;

  // Normalize
  const mag = Math.sqrt(vector.reduce((sum, v) => sum + v*v, 0));
  return mag === 0 ? vector : vector.map(v => v / mag);
}

export function cosineSimilarity(v1: Vector, v2: Vector): number {
  if (v1.length !== v2.length) return 0;
  let dot = 0;
  let m1 = 0;
  let m2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    m1 += v1[i] * v1[i];
    m2 += v2[i] * v2[i];
  }
  if (m1 === 0 || m2 === 0) return 0;
  return dot / (Math.sqrt(m1) * Math.sqrt(m2));
}

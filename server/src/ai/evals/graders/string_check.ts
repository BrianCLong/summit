export function stringCheck(actual: string, expected: string): number {
  return actual.includes(expected) ? 1.0 : 0.0;
}

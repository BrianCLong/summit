export function band(now: Date, intensity: number) {
  return intensity < 200 ? 'green' : intensity < 400 ? 'amber' : 'red';
}

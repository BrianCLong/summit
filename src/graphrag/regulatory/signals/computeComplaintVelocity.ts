<<<<<<< HEAD
export function computeComplaintVelocity(volume: number, priorVolume: number): number {
=======
export function computeComplaintVelocity(volume: number, priorVolume: number) {
>>>>>>> origin/main
  if (priorVolume === 0) return volume;
  return (volume - priorVolume) / priorVolume;
}

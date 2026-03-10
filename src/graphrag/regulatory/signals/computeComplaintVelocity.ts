export function computeComplaintVelocity(volume: number, priorVolume: number) {
  if (priorVolume === 0) return volume;
  return (volume - priorVolume) / priorVolume;
}

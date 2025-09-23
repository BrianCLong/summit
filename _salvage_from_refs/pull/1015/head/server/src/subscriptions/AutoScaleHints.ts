export function hpaHints(backpressure: {
  inFlight: number;
  max: number;
  drops: number;
  p95: number;
}) {
  return {
    desiredReplicas: Math.min(
      10,
      Math.max(1, Math.ceil(backpressure.inFlight / (backpressure.max * 0.7)))
    ),
  };
}

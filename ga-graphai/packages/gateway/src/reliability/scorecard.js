export function computeScorecard(serviceTelemetry, rubric) {
  return serviceTelemetry.map((service) => {
    const rubricEntry = rubric[service.tier];
    const sloScore = clamp(1 - service.sloBurnRate, 0, 1) * rubricEntry.weights.slo;
    const mttrScore =
      clamp(1 - service.mttrHours / rubricEntry.targets.mttrHours, 0, 1) * rubricEntry.weights.mttr;
    const changeScore = clamp(1 - service.changeFailRate, 0, 1) * rubricEntry.weights.change;
    const total = sloScore + mttrScore + changeScore;
    return {
      service: service.name,
      tier: service.tier,
      sloBurnRate: service.sloBurnRate,
      mttrHours: service.mttrHours,
      changeFailRate: service.changeFailRate,
      score: Number(total.toFixed(3)),
      actions: deriveActions(service),
    };
  });
}

function deriveActions(service) {
  const actions = [];
  if (service.sloBurnRate > 2) actions.push("freeze releases");
  if (service.changeFailRate > 0.15) actions.push("mandate canary");
  if (service.mttrHours > 1) actions.push("add runbook drill");
  return actions;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

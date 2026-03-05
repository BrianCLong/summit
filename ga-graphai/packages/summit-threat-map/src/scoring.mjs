export function decayFactor(observedAtIso, halfLifeMinutes, now = new Date()) {
  const observedAt = new Date(observedAtIso);
  const ageMinutes = Math.max(0, (now.getTime() - observedAt.getTime()) / 60000);
  return Math.pow(0.5, ageMinutes / halfLifeMinutes);
}

export function scoreEvent(event, config, now = new Date()) {
  const exposure = event.exposureState === 'exposed' ? 1 : 0;
  const compromise = event.compromiseState === 'compromised' ? 1 : event.compromiseState === 'suspected' ? 0.5 : 0;
  const severity = Math.max(0, Math.min(1, event.severity));
  const isKev = Boolean(event.cve && event.evidence.why.toLowerCase().includes('kev'));

  const base =
    exposure * config.weights.exposure +
    compromise * config.weights.compromise +
    severity * config.weights.severity;

  const weighted = base * (isKev ? config.weights.kevMultiplier : 1);
  return Number((weighted * decayFactor(event.observedAt, config.halfLifeMinutes, now)).toFixed(6));
}

export function evaluateDrill({ tier, start, finish, targets }) {
  const elapsed = finish - start;
  const { rpoMinutes, rtoMinutes } = targets[tier];
  return {
    elapsedMinutes: elapsed / 60000,
    metRto: elapsed / 60000 <= rtoMinutes,
    metRpo: elapsed / 60000 <= rpoMinutes,
  };
}

export function runSyntheticChecks(checks) {
  return checks.every((check) => check());
}

import statsmodels from 'statsmodels';

export function planningStudio(config) {
  const risk = statsmodels.forecast({ risk: config.integrityThreshold });
  return { sim: `Strategy with ${risk.risk}% risk` };
}
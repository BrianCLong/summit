import statsmodels from 'statsmodels';
import d3 from 'd3';

export function riskMitigator(config) {
  const risk = statsmodels.forecast({ integrity: config.integrityThreshold });
  return { mitigation: `Risk at ${risk}%` };
}

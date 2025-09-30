export type ScenarioParams = {
  months: number;
  priceFactor?: number;       // e.g., 1.10
  winrateFactor?: number;     // e.g., 1.15
  churnFactor?: number;       // e.g., 0.9  (reduce churn)
  cacDelta?: number;          // e.g., +50  (absolute $ change)
  onboardingLagMonths?: number; // delay revenue recognition
};

export function runScenario(p: ScenarioParams){
  const M = Math.max(1, Math.min(60, p.months||12));
  const basePrice = 100; const baselineWinrate = 0.25; const baselineChurn = 0.03;
  const baselineCAC = 500; const baselineLeads = 100; const seatsPerDeal = 50;

  const price = basePrice * (p.priceFactor || 1);
  const winrate = baselineWinrate * (p.winrateFactor || 1);
  const churn = baselineChurn * (p.churnFactor || 1);
  const cac = Math.max(0, baselineCAC + (p.cacDelta || 0));
  const lag = Math.max(0, Math.min(12, p.onboardingLagMonths || 0));

  const baseline = { revenueMonthly:[], burnMonthly:[], arr:0, burn:0 };
  const proposal = { revenueMonthly:[], burnMonthly:[], arr:0, burn:0 };

  let baseARR = 0, propARR = 0;
  for (let m=0; m<M; m++){
    // baseline
    const baseWon = baselineLeads * baselineWinrate;
    baseARR = baseARR * (1 - baselineChurn) + baseWon * seatsPerDeal * basePrice * 12;
    const baseRev = (m >= lag) ? baseARR/12 : 0;
    const baseBurn = 200000 + baselineLeads * baselineCAC;
    baseline.revenueMonthly.push(baseRev);
    baseline.burnMonthly.push(baseBurn);
    // proposal
    const propWon = baselineLeads * winrate;
    propARR = propARR * (1 - churn) + propWon * seatsPerDeal * price * 12;
    const propRev = (m >= lag) ? propARR/12 : 0;
    const propBurn = 200000 + baselineLeads * cac;
    proposal.revenueMonthly.push(propRev);
    proposal.burnMonthly.push(propBurn);
  }
  baseline.arr = baseARR; baseline.burn = baseline.burnMonthly.at(-1) || 0;
  proposal.arr = propARR; proposal.burn = proposal.burnMonthly.at(-1) || 0;
  return { baseline, proposal, params: p };
}
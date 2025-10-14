import { RunTrace, StressProfile, ReplayResult, Sanction } from './types';

function simulate(trace: RunTrace, stress: StressProfile){
  let drift = 0; let costDelta = 0;
  // crude model: fail some steps, enforce stricter policy implies replan
  for (const s of trace.steps){
    if (Math.random() < stress.apiFailureRate) drift += 0.1;
    const cappedTokens = Math.min(s.tokens, stress.tokenCap);
    costDelta += (cappedTokens - s.tokens) * 0.000002; // $ per token
  }
  if (stress.policyStrict) drift += 0.2;
  return { drift, costDelta };
}

function proposeSanctions(rr:{drift:number; costDelta:number}): Sanction[] {
  const s: Sanction[] = [];
  if (rr.drift > 0.25) s.push({ type:'proof_required', value:'strict', rationale:'High drift under stress' });
  if (rr.drift > 0.4) s.push({ type:'interstitial', value:'attn', rationale:'User interstitial advised' });
  if (rr.costDelta < -0.05) s.push({ type:'rate_limit', value:5, rationale:'Cost spike risk' });
  return s;
}

export function replayWithSanctions(trace: RunTrace, stress: StressProfile): ReplayResult {
  const rr = simulate(trace, stress);
  return { ...rr, sanctions: proposeSanctions(rr) };
}
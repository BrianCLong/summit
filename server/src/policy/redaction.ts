export function redactByPolicy(summary:{text:string; bullets:string[]; actions:string[]}, policy:{ classification:'public'|'internal'|'restricted'}){
  if (policy.classification==='public'){
    return {
      text: scrub(summary.text),
      bullets: summary.bullets.map(scrub),
      actions: summary.actions.map(scrub)
    };
  }
  if (policy.classification==='restricted'){
    return {
      text: removeSecrets(summary.text),
      bullets: summary.bullets.map(removeSecrets),
      actions: summary.actions.map(removeSecrets)
    };
  }
  return summary;
}
function scrub(s:string){ return s.replace(/\b(PII|account|budget|secret)\b/gi,'[redacted]'); }
function removeSecrets(s:string){ return s.replace(/\b(secret|token|password|key)\b/gi,'[redacted]'); }
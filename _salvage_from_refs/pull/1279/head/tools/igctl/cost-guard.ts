import { execSync } from 'child_process';

type Tier = 'throttle'|'disable_enrichers'|'reduce_llm'|'pause_analytics'|'read_only'|'emergency_core';

export function downshift(t: Tier) {
  const cmd = {
    throttle: 'kubectl scale deploy api --replicas=2',
    disable_enrichers: 'kubectl label deploy -l app=enricher enabled=false --overwrite',
    reduce_llm: 'kubectl set env deploy -l app=llm GATEWAY_MODE=lean',
    pause_analytics: 'kubectl scale deploy -l app=analytics --replicas=0',
    read_only: 'kubectl set env deploy -l app=graphql READ_ONLY=true',
    emergency_core: 'kubectl apply -f helm/profiles/emergency-core.yaml',
  }[t];
  execSync(cmd, { stdio: 'inherit' });
}

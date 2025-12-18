# Threat Analytics

Advanced threat detection and anomaly analysis toolkit providing behavioral analytics, pattern recognition, correlation, and automated triage suitable for SOC-grade workflows.

## Features
- Adaptive behavioral baselines with z-score anomaly detection
- Pattern recognition for credential abuse, lateral movement, and exfiltration
- Correlation of behavioral signals with threat intelligence from MISP/STIX/TAXII
- Temporal analysis for dwell time and burst detection
- Entity resolution with alias merging and profile enrichment
- Threat scoring and automated triage planning
- Custom detection rules and alert lifecycle management

## Usage
```ts
import { ThreatAnalyticsEngine, MispClient, StixBundleAdapter } from '@ga-graphai/threat-analytics';

const engine = new ThreatAnalyticsEngine({
  intel: { minConfidence: 50 },
});
engine.registerIntelClient(new MispClient(() => fetchMispFeed()));
engine.registerIntelClient(new StixBundleAdapter(() => fetchStixBundle()));
await engine.syncIntel();

const alerts = engine.processEvent({
  entityId: 'user-1',
  actor: 'user-1',
  action: 'auth.fail',
  timestamp: Date.now(),
});
```

### Intel hygiene
- Indicators below `minConfidence` are ignored.
- Expired indicators (based on `validUntil`) are dropped during `syncIntel`.
- When the same indicator arrives from multiple sources, the highest-confidence (or latest-expiring tie) wins.

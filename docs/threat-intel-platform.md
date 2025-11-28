# Summit Threat Intelligence Platform Integration

This document describes the design and usage of the in-repo threat intelligence platform module that delivers STIX/TAXII ingestion, MITRE ATT&CK mapping, IOC enrichment, threat scoring, correlation, and partner-sharing workflows.

## Architecture Overview

- **Data model**: Strongly typed interfaces for STIX/TAXII objects, MITRE ATT&CK techniques, threat actor profiles, IOCs, CVEs, dark web mentions, and TLP-aware partner agreements.
- **Processing pipeline**: Ingestion normalizes TLP, deduplicates STIX content, enriches IOCs with dark web sightings and CVE overlap, maps tactics/techniques, and runs scoring plus correlation.
- **Correlation engine**: Links actors to IOCs by shared techniques, CVE overlaps, and dark web mentions, generating narrative context and sortable risk scores.
- **Threat hunting**: Rule objects execute over arbitrary event streams while respecting TLP ceilings, enabling automated hunts without external dependencies.
- **Sharing controls**: Partner profiles enforce maximum TLP, ensuring downstream distribution honors disclosure constraints across STIX, IOCs, CVEs, actors, and dark web intelligence.

## Key Capabilities

1. **STIX/TAXII feeds**: `ingestStixFeed` accepts STIX-like objects, normalizes TLP, and provides accepted/rejected counts to track feed health.
2. **MITRE ATT&CK mapping**: `mapAttackTechniques` resolves technique IDs to tactics, detections, and mitigations using seeded content (extensible at construction time).
3. **Threat actor profiling**: `addThreatActorProfile` stores actor intent, sophistication, and kill-chain preferences for downstream scoring and correlation.
4. **IOC management and enrichment**: `addIoc` automatically enriches with reputation, ASN/geo tags, dark web hits, CVE overlap, and related actors.
5. **TLP handling**: All stores respect TLP ranking (`CLEAR < GREEN < AMBER < RED`) with filtering applied in partner sharing and hunting.
6. **Threat scoring**: `computeThreatScore` blends severity, confidence, IOC density, sophistication, kill-chain position, exploitation signal, and enrichment depth.
7. **Automated threat hunting**: `hunt` executes rule callbacks over event batches with optional TLP requirements.
8. **Threat correlation engine**: `correlate` produces correlated threat narratives with sorted scores and actor/IOC/CVE/dark web context.
9. **Intelligence sharing**: `shareIntelligence` returns partner-scoped packages constrained by TLP limits and feed selection.
10. **Custom feeds and dark web intelligence**: `registerCustomFeed` bootstraps bespoke sources, while `addDarkWebIntel` captures mentions tied to indicators.
11. **CVE tracking and exploitation awareness**: `trackCve` registers vulnerabilities, factoring exploitation signals into correlation and scoring.
12. **TAXII bundle ingestion**: `ingestTaxiiBundle` accepts STIX/TAXII bundles, infers TLP from marking definitions, and reuses feed ingestion safeguards.

## Usage Example

```ts
import { ThreatIntelPlatform } from '../src/threat-intel/platform';

const platform = new ThreatIntelPlatform();

platform.ingestStixFeed('taxii-lab', [
  {
    id: 'indicator--1',
    type: 'indicator',
    name: 'Beacon',
    created: new Date(),
    modified: new Date(),
  },
]);

platform.addThreatActorProfile({
  id: 'actor-1',
  name: 'APT Atlas',
  motivations: ['espionage'],
  sophistication: 'apt',
  region: 'global',
  sectors: ['cloud'],
  knownTechniques: ['T1190'],
  preferredKillChainPhases: ['exploitation'],
  confidence: 90,
  tlp: 'AMBER',
});

platform.addIoc({
  id: 'ioc-1',
  type: 'domain',
  value: 'apt-atlas.onion',
  source: 'sinkhole',
  confidence: 70,
  tlp: 'AMBER',
  sightings: 5,
  tags: ['geo:global'],
  relatedTechniques: ['T1190'],
});

const correlated = platform.correlate();
const partnerView = platform.shareIntelligence({ id: 'p1', name: 'analyst', maxTlp: 'GREEN', acceptedFeeds: [] });

// TAXII bundle ingestion with TLP inference
platform.ingestTaxiiBundle('taxii-bundle', {
  type: 'bundle',
  objects: [
    {
      id: 'indicator--10',
      type: 'indicator',
      name: 'Beacon infrastructure',
      created: new Date(),
      modified: new Date(),
      object_marking_refs: ['marking-definition--tlp:red'],
    },
  ],
});
```

## Observability and Testing

- Deterministic scoring and correlation enable straightforward monitoring via metrics on accepted/rejected feed counts, IOC enrichment scores, and partner-distribution volumes.
- Jest tests under `tests/threat-intel/` validate ingestion, MITRE mapping, enrichment, scoring, TLP enforcement, and hunting behavior.

## Extensibility

- Add new MITRE techniques by seeding `ThreatIntelPlatform` with a wider catalog.
- Implement additional enrichment (geo-IP, sandboxing) inside `enrichIoc` while maintaining TLP enforcement through `shareIntelligence`.
- Extend hunting rules with machine-learning–backed matchers without changing the orchestration surface area.

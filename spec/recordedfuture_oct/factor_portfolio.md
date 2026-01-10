# Factor Portfolio

## Core Factors

- **Exposure**: surface area, known vulnerable services.
- **Exploitability**: presence of exploit code, weaponization signals.
- **Actor interest**: chatter or targeting indicators.
- **Infrastructure proximity**: shared hosting, ASN adjacency, malware reuse.

## Portfolio Construction

- Each factor is computed from a bounded subset of signals.
- Signals are weighted by provenance trust and freshness decay.
- Factor values are normalized to ensure comparability.

## Outputs

- Factor vector with explanatory metadata.
- Minimal support set of signals per factor (proof budget).

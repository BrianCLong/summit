# Extortion Pressure Model Standard

## Purpose
This standard defines Summit's approach to modeling and operationalizing ransomware extortion pressure, shifting from simple "restore from backup" to a multi-vector risk assessment.

## Evidence Types (ITEM:CLAIM-01,04,05,07,08)
- **LeakSiteRecord**: Records from threat actor leak sites or "shadow transparency" layers.
- **ExposureFinding**: Concrete findings of exposure that attackers leverage (e.g., internet-exposed MongoDB with no auth).
- **ExtortionNoteAnalysis**: Analysis of coercion tactics found in ransom notes.

## Determinism Rules
- **No unstable timestamps**: All `report.json` and `metrics.json` files must be free of unstable timestamps to maintain repository hash stability.
- **Stable IDs**: Evidence IDs must be derived from canonical JSON content (e.g., `EVD-EXTORTION-<date>-<hash>`).
- **Canonical Sorting**: Collections must be sorted by a stable key before serialization.

## Data Model (Summit Original, grounded in ITEM)
- `PressureScore`: A composite score of extortion pressure.
  - `legal_regulatory`: Impact of GDPR, NIS2, HIPAA, etc. (ITEM:CLAIM-06)
  - `reputation`: Public shaming and reputational harm. (ITEM:CLAIM-01)
  - `operational`: Downtime and encryption impact. (ITEM:CLAIM-02)
  - `coercion`: Intensity of psychological tactics (surveillance, time pressure). (ITEM:CLAIM-08)

## Governance
- All extortion-related logic must be gated behind `FEATURE_EXTORTION_PRESSURE`.
- "Never-log" rules apply to all raw note text and leaked credentials.

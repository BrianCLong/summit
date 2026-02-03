# Runbook: Extortion Pressure Response

## Overview
This runbook guides responders through handling ransomware extortion incidents using Summit's Extortion Pressure module.

## Workflow
1. **Enable Feature Flag**: Set `FEATURE_EXTORTION_PRESSURE: true` in `feature_flags.json`.
2. **Ingest Evidence**:
   - Upload ransom note text.
   - Import leak site records (CSV/JSON).
   - Link any `ExposureFinding` (e.g., misconfigured DBs).
3. **Analyze Pressure**:
   - Review auto-classified tactics (`SURVEILLANCE_CLAIM`, `TIME_PRESSURE`, etc.).
   - Evaluate the computed `PressureScore`.
4. **Decision Support**:
   - Generate the `pressure_packet.report.json` for executive review.
   - Use the `explain` map to justify risk levels to stakeholders.

## Pressure Vector Matrix
| Vector | Mitigation Strategy |
| --- | --- |
| Legal/Regulatory | Map to GDPR/HIPAA breach notification timelines. |
| Reputational | Prepare comms for public shaming/leak site postings. |
| Coercion | Identify bluff vs. proof-of-access in ransom note claims. |

## Verification
- Run `pnpm run verify:extortion` to ensure all evidence gates pass.
- Check `artifacts/extortion/` for generated reports.

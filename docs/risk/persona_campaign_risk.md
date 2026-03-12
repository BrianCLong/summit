# Persona & Campaign Risk Objects and Scoring

## Commander's Intent
This module introduces structured risk objects for personas and campaigns. Its goal is to improve signal-to-noise and defensive responsiveness by providing a transparent, additive scoring model. Instead of relying on raw, disparate events or black-box models, we aggregate risk factors into a clear, unified risk tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). This allows for consistent and explainable alerting workflows.

## Scoring Model
The risk score is calculated using an additive logic framework based on input signals.
Each signal is processed into a `RiskFactor` containing:
- `name`: Identifier for the signal.
- `weight`: The multiplier for the signal's value.
- `value`: The raw value of the signal.
- `contribution`: The calculated contribution to the total score (`weight` * `value`).

The total risk score is the sum of all signal contributions, capped at 100.

### Tier Boundaries
The calculated total score determines the `RiskLevel`:
- **LOW**: `< 25`
- **MEDIUM**: `25` to `< 50`
- **HIGH**: `50` to `< 75`
- **CRITICAL**: `>= 75`

## Abuse Analysis
**Potential Misuse:** Risk scores could be misused for over-surveillance or unwarranted targeting of entities by inappropriately altering weights or introducing biased signals.
**Mitigation:** This layer is strictly designed for internal defensive monitoring. The logic is explicit and additive, ensuring transparency in how a score is derived. No automated actions (e.g., banning or public engagement) are taken based on these scores. Any resulting actions or integrations with playbooks require human oversight, and the framework will be governed by the Governance Council OS.

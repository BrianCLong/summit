# Clean Rooms v2

Clean Rooms v2 introduces differential privacy enforcement for all persisted templates.

## Manifest
`epsilonCap`, `delta`, `kMin`, `cooldownSec`, and `allowedTemplates` govern query limits.

## Policy
Exports are denied when cohorts fall below `kMin` or when budgets exceed caps. Waivers require dual approval and expire within 24 hours.

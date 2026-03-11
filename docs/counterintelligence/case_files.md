# Digital Case File & Turning Ledger

## Overview
The Digital Case File abstraction turns adversarial assets (accounts, outlets, campaigns, bot clusters) into structured, auditable sensors and early-warning sources.

This operates strictly in a defensive, protective, and counterintelligence posture.

## Core Components
- `CounterintelligenceCaseFile`: A domain object referencing adversarial assets. Tracks access, motivation, vulnerability, and intelligence value for defensive analysis only.
- `TurningLedger`: An append-only log structure recording state transitions (e.g., `IDENTIFIED -> SUSPECTED_ADVERSARIAL -> MONITORED_SENSOR -> TURNED_EARLY_WARNING -> BURNED`).

## Constraints
- **Operational Constraints**: Analysts must not directly engage or influence these assets.
- **Append-only ledger**: State transitions are rigorously tracked and cannot be erased or modified.

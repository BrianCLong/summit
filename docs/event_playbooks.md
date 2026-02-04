# CogWar 2026: Event Playbooks

## Overview
The Event Playbook system provides a time-windowed monitoring and evidence capture architecture for major cognitive warfare theaters (e.g., Olympics, elections, summits).

## Architecture
- **Event Schemas**: Defined in `schema/event.yaml` and `schema/event_playbook.yaml`.
- **Playbook Runner**: CLI tool `tools/event_playbook.py` that processes event fixtures and emits deterministic evidence bundles.
- **Fusion Correlator**: Correlates narrative spikes with cyber/infra incidents to detect potential coordination.

## Security & Governance
- **Analytics Only**: The system is strictly for analytics and evidence capture.
- **Policy Enforcement**: `policy/event_policy.yaml` enforces "deny-by-default" for offensive actions.
- **Deterministic Evidence**: All runs produce Evidence IDs following the `EVD-COGWAR-2026-EVENT-` pattern.

## Non-Goals
- No counter-messaging generation.
- No automated amplification recommendations.
- No identification of persuadable individuals.

## Usage
```bash
# Run basic analytics
python3 tools/event_playbook.py --fixture fixtures/event/event_benign.json

# Run fusion correlation
python3 tools/event_playbook.py --fixture fixtures/event/event_synchronized.json --fusion
```

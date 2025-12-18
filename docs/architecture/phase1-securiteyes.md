# Securiteyes MVP Architecture

## Overview
Securiteyes is the defensive security subsystem responsible for detecting threats, correlating events into incidents, and triggering defensive responses.

## Components

### Detection Engine
Rule-based engine that processes raw events.
- **Rule 1**: Excessive Login Failures (>5 failures).
- **Rule 2**: Unusual IP Subnet (Mocked logic).
- **Rule 3**: High Velocity Task Creation (>20/min).

### Incident Correlator
Aggregates `SuspiciousEvent`s into `Incident`s.
- Creates `Incident` nodes in IntelGraph.
- Performs Governance checks before escalation (preventing automated over-reaction).

## Philosophy
Strictly defensive. No offensive capabilities or "hack-back" logic is permitted.

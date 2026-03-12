# Trust Portal UI

This document details the minimal front-end Trust Portal implemented in `ui/components/trust/TrustPortal.tsx`.

## Purpose
Provide a highly summarized, opinionated UI displaying key metrics about Summit's narrative risk posture, governance decisions, and automation safeguards. It translates API responses into an accessible format for external stakeholders.

## Intended Audience
- **Partners and Enterprise Customers**: Those who require visibility into AI operations and transparency regarding safety models without accessing the underlying systems.
- **Auditors / Regulators**: Need high-level proof of active AI TRiSM frameworks and human-in-the-loop oversight.

## What it does show
- Aggregated numbers (e.g. how many "Tier 3" decisions were made).
- Top-level narrative categories (e.g. "disinformation").
- Ratio of automations vs. human-gated interventions.
- Clear context on what the platform is mitigating.

## What it DOES NOT show
- Raw entity identifiers (no user names, handle names, system internals).
- Details about proprietary rules, or the code specifics behind how an AI governance decision was made.
- Streaming data (it represents a periodic point-in-time snapshot).

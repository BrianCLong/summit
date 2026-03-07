# AI-IO Watchlist Schema

## Overview
This schema defines the structure for AI-IO watchlist items. It ensures deterministic serialization and machine-verifiability for the IntelGraph platform.

## Schema Version
`1.0.0`

## Data Model

```json
{
  "evidence_id": "SUMMIT-AIIO-0001",
  "category": "bot_infra_trend",
  "title": "Living-off-the-land influence infrastructure",
  "watch_priority": "P1",
  "why_now": "...",
  "observable_signals": ["..."],
  "summit_fit": ["timeline", "entity graph", "cross-platform clustering"],
  "claim_refs": ["ITEM:CLAIM-03"]
}
```

## Fields

- `evidence_id` (string, required): A unique identifier for the watchlist item. Must follow the pattern `SUMMIT-AIIO-####`.
- `category` (string, required): The category of the watchlist item. Must be one of `research_program`, `bot_infra_trend`, or `detection_method`.
- `title` (string, required): A concise and descriptive title for the watchlist item.
- `watch_priority` (string, required): The priority level for the watchlist item. Must be `P1` or `P2`.
- `why_now` (string, required): A brief explanation of why this item is currently relevant.
- `observable_signals` (array of strings, required): A list of specific signals or indicators associated with this item.
- `summit_fit` (array of strings, required): A list of ways this item aligns with the Summit platform's capabilities or goals.
- `claim_refs` (array of strings, optional): A list of references to specific claims or evidence supporting this item.

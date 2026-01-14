---
name: ui-preview
description: Playwright UI preview for snapshot-based UI validation.
triggers:
  - ui-preview
  - ui
shards:
  default:
    - preview
  deep:
    - review
  ci:
    - ci
---

Use this skillpack when UI changes require a controlled preview or snapshot evidence. The
playwright shard is intentionally minimal to reduce context overhead.

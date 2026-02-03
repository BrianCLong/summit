---
name: ui-preview
description: UI validation skillpack for preview builds.
triggers:
  tasks:
    - review
  paths:
    - apps/web/**
    - client/**
  keywords:
    - ui
shards:
  - default
  - deep
  - ci
---

Use this skillpack to validate UI changes with minimal MCP tooling, escalating to deeper shards only when the review scope requires it.

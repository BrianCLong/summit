# Human Steering Guide

## Overview

This guide allows human operators to steer the autonomous agents (Maestro, Sentinel) between **Exploration** (learning, mapping) and **Exploitation** (executing, optimizing) modes.

## Steering Controls

### 1. Mode Selection

Agents read the `mode` field in `TASK_BACKLOG.md`:

- `exploration`: Agents will analyze code, suggest refactors, and map dependencies.
- `exploitation`: Agents will execute backlog tasks strictly.

### 2. Guardrails

- **Restricted Paths:** Defined in `TB-04`. Agents cannot modify `secrets/` or `auth/` without human sign-off.
- **Budget:** Cost impacts > $50/mo require approval.

## Usage

To switch modes, edit `TASK_BACKLOG.md` and change the header YAML or config table.
Example:

```yaml
mode: exploration
```

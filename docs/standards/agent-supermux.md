# Agent Supermux Standards

## Overview
Supermux is a runtime substrate for multi-agent work. It provides:
- Multiplexed streams (data plane)
- Start/stop/resize (control plane)
- Deterministic append-only logs (evidence plane)
- Deny-by-default sandbox (policy plane)

## Minimal Winning Slice
1. `summit supermux up --agents 3`
2. `summit supermux ls`
3. `summit supermux attach <id>`
4. `summit supermux down`
5. `summit supermux replay <run-id>`

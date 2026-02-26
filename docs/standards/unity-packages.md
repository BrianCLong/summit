# Unity Package Standards for Summit

This document defines Summit's Unity package subsumption contract.

## Inputs
- Unity `package.json` manifest
- Assembly definition files (`*.asmdef`)
- Scoped registry declarations

## Outputs
- `package-report.json`: deterministic dependency + assembly analysis
- `metrics.json`: counts for dependencies, assemblies, registries
- `stamp.json`: schema + determinism declaration

## Determinism Rules
- No timestamps in emitted artifacts
- JSON keys sorted in writer
- Dependency and assembly listings sorted

## Non-Goals
- Hosting Unity registries
- Replacing Unity Package Manager
- Building Unity runtime plugins

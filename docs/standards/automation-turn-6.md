# Automation Turn #6 — Interop & Standards

## Overview
This document defines the standards for "Automation Turn #6", an OSINT methodology update.

## Formats to Import/Export
- **Input:** Subsumption Bundle Manifest (YAML)
- **Output:** Evidence Bundle (JSON)

## Claim Registry Mapping
- **CLAIM-01:** "OSINT collection is expanding beyond 'what was said' to 'how systems present, shape, and constrain information'."
- **CLAIM-02:** "Validation frameworks increasingly adjust confidence based on how platform algorithms amplify or suppress a signal."
- **CLAIM-03:** "Automated systems are beginning to ingest rank and exposure metadata alongside content."
- **CLAIM-04:** "Methodological shift towards system-aware intelligence."

## Non-Goals
- Real-time ingestion of social media feeds (scope: methodology update, not tool implementation yet).
- Modifying existing OSINT tools (scope: bundle framework first).

## Compatibility Notes
- Compatible with Summit Evidence Contract Standard (ECS).
- Requires Node 20+ for verifier.

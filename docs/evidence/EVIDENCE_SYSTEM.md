# Summit Evidence System

## Overview

The Summit Evidence System ensures that every meaningful change ships with machine-verifiable proof. It enforces a strict schema for evidence bundles and integrates with CI/CD to prevent regression and drift.

## Bundle Structure

An evidence bundle is a directory containing:

*   `index.json`: The manifest mapping Evidence IDs to artifacts.
*   `report.json`: Human-readable summary and classification.
*   `metrics.json`: Machine-readable counters and metrics.
*   `stamp.json`: Provenance data (timestamps, git SHA). **Only this file may contain timestamps.**

## Schemas

Schemas are located in `evidence/schemas/`.

*   `evidence.index.schema.json`
*   `report.schema.json`
*   `metrics.schema.json`
*   `stamp.schema.json`

## Evidence IDs

Evidence IDs must follow the format: `EVD-<ITEMSLUG>-<AREA>-<NNN>`

Example: `EVD-GOV-EVIDENCE-CI-001`

## Validation

The system is validated by `tools/evidence/validate.mjs` which runs in CI.

## Usage

To generate an evidence bundle, ensure your tool outputs the required JSON files and a valid `index.json`.

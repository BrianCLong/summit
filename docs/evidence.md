# Summit Evidence System

This directory contains the evidence artifacts for the Summit platform.
The evidence system ensures that all critical capabilities, compliance requirements, and governance gates are verified deterministically.

## Structure

- `index.json`: The master index of all evidence items.
- `schemas/`: JSON schemas for validation.
- `items/`: (Optional) Directory for storing evidence artifacts if not stored alongside code.

## Artifacts

Each evidence item typically consists of:
- `report.json`: High-level summary and status.
- `metrics.json`: Quantitative measurements.
- `stamp.json`: Timestamp and provenance.

## Determinism

Timestamps are allowed **only** in `stamp.json`. All other artifacts must be deterministic (content-addressable).

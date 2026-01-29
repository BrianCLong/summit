# Evidence Bundles

This directory contains the schemas and templates for the Summit Evidence System, designed to professionalize OSINT tradecraft.

## Structure

An evidence bundle consists of:

*   `evidence/index.json`: A deterministic index mapping Evidence IDs to file paths and SHA256 hashes.
*   `evidence/report.json`: The main report containing claims, evidence refs, and summaries.
*   `evidence/metrics.json`: Operational metrics like time-to-insight and break-rate.
*   `evidence/stamp.json`: The ONLY place where non-deterministic timestamps and tool versions are allowed.

## Schemas

Schemas are located in `evidence/schemas/`:

*   `report.schema.json`
*   `metrics.schema.json`
*   `stamp.schema.json`
*   `index.schema.json`

## Templates

Minimal valid JSON templates are provided in `evidence/templates/`.

## IDs

Evidence IDs must follow the pattern: `^EVD-OSINTENTERPRISE-[A-Z0-9_]+-[0-9]{3}$`.

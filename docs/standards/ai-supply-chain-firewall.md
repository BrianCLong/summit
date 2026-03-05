# AI Supply Chain Firewall Standards and Interop

This document outlines the standard import/export formats and goals for the AI Supply Chain Firewall.

## Import/Export Matrix

* **Inputs:**
  * Lockfiles (npm/yarn/pnpm, pip/poetry)
  * SBOM (CycloneDX/SPDX if supported)
  * AI assistant "suggested dependencies" logs

* **Outputs:**
  * SARIF (optional)
  * `report.json` (Summit evidence schema format)
  * Policy decision log (redacted, deterministic)

## Non-Goals

* Full Software Composition Analysis (SCA) replacement
* Real-time registry mirroring
* Malware reverse engineering

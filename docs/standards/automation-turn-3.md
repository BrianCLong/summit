# Automation Turn #3 — Interop & Standards

## Overview

This document defines the standards for "Automation Turn #3", a daily cyber threat intelligence briefing focused on cloud and software supply chain risks.

## Formats to Import/Export

- **Input:** Subsumption Bundle Manifest (YAML)
- **Output:** Evidence Bundle (JSON)

## Claim Registry Mapping

- **CLAIM-01:** Fake OSS installer sites distribute RMM malware via trusted tool lookalikes.
- **CLAIM-02:** Malicious OSS packages scaled to ~454k in 2025, increasing supply-chain exposure.
- **CLAIM-03:** WinRAR CVE-2025-8088 remains exploited by nation-linked actors for archive-based delivery.
- **CLAIM-04:** WorldLeaks-style extortion relies on bulk data exfiltration without encryption.
- **CLAIM-05:** AI-generated, real-time malicious JavaScript complicates static detection.
- **CLAIM-06:** Supply-chain attacks expand through cloud integrations and SaaS trust relationships.
- **CLAIM-07:** Phishing and credential theft remain core initial access vectors for ransomware/extortion.

## Non-Goals

- Direct ingestion of source feeds (briefing only, no ingest pipeline changes).
- Modifying threat attribution logic (evidence-only bundle).

## Compatibility Notes

- Compatible with Summit Evidence Contract Standard (ECS).
- Requires Node 20+ for verifier.

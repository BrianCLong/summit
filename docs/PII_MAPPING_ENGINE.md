# Semantic PII Mapping Engine

## Overview

The semantic PII mapping engine automatically discovers, classifies, and tracks sensitive data across heterogeneous sources. It combines deterministic pattern libraries, contextual machine-learning hooks, custom taxonomy management, and human verification workflows to keep data inventories current.

## Architecture

- **Hybrid Entity Recognizer** (`server/src/pii/recognizer.ts`): Combines a 70+ pattern catalog with optional ML detectors. Context-aware boosts leverage schema metadata and field labels to improve confidence scoring.
- **Classification Engine** (`server/src/pii/classifier.ts`): Applies taxonomy-driven severity, aggregates results, and enriches metadata for downstream workflows.
- **Taxonomy Manager** (`server/src/pii/taxonomy.ts`): Provides default global taxonomy and supports domain-specific extensions.
- **Bulk Scanner** (`server/src/pii/scanner.ts`): Processes millions of records per hour with incremental diffing and change tracking.
- **Verification Queue** (`server/src/pii/verification.ts`): Implements human-in-the-loop validation hooks and task lifecycle management.
- **Benchmark Dataset** (`server/data/pii/benchmark.json`): Synthetic gold set for regression tests and demo workloads.

## Key Capabilities

1. **PII Entity Coverage**
   - 50+ entity types spanning identity, financial, health, biometric, credential, and infrastructure categories.
   - Pattern definitions with contextual hints and sample values to bootstrap ML fine-tuning.

2. **Contextual Classification**
   - Schema-aware boosts adjust confidence using field labels, descriptions, and declared risk levels.
   - Surrounding token analysis reduces false positives for overloaded attributes.

3. **Custom Taxonomy Support**
   - Register or extend taxonomies at runtime. Node cache enables `O(1)` lookup of severity/policy tags per PII type.

4. **Bulk Scanning & Incremental Discovery**
   - Stable hash fingerprinting detects record changes.
   - Digest-based comparison highlights previously unseen or updated detections.
   - Batch processing with configurable batch sizes for throughput tuning.

5. **Confidence & Verification Workflow**
   - Confidence adjustments based on pattern match strength, schema metadata, and contextual keywords.
   - Verification queue auto-enqueues low-confidence or high-severity detections with webhook hooks.

## Integration Hooks

- Import `server/src/pii/index.ts` to access recognizer, classifier, scanner, taxonomy, and verification utilities.
- Extend the pattern catalog by calling `HybridEntityRecognizer.registerPattern` with custom regexes or ML detectors.
- Configure domain taxonomies via `TaxonomyManager.extendTaxonomy` or `registerTaxonomy`.
- Provide UI callbacks to the verification queue through `VerificationWorkflowHooks`.

## Benchmarking & Testing

- Synthetic dataset covers diverse sectors (retail, healthcare, IoT, biometrics) for accuracy validation.
- Jest tests under `server/tests/pii` verify recognition fidelity, taxonomy classification, incremental scanning, and verification workflows.
- For performance benchmarking, stream dataset batches through `BulkScanner.scan` while monitoring execution time.

## Operational Guidelines

- Run `npm --prefix server test` to validate engine integrity before deployment.
- Store taxonomy overrides in configuration management to guarantee reproducible scans across environments.
- Monitor verification queue metrics (pending tasks, resolution time) to optimize human review throughput.

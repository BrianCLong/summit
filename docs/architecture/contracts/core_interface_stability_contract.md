# Core Interface Stability Contract

This document outlines the stability contracts for the core interfaces of the Summit architecture. It establishes the rules of engagement for modifying critical integration points, ensuring predictability, backward compatibility, and clear communication for downstream consumers.

## 1. Scope of Stability Contracts

This contract applies strictly to the following core interfaces:

### 1.1 Retriever APIs

- **Definition:** Endpoints and methods used by the retrieval augmented generation (RAG) system to fetch context, documents, and evidence.
- **Contract:** Response schemas must be additive only. Existing fields cannot be removed or have their types changed without a major version bump. Error codes and message formats must remain consistent.

### 1.2 Query Planner Plugin Interfaces

- **Definition:** The execution contract and schema definitions for plugins invoked by the query planner and orchestrator.
- **Contract:** The `PluginInput` and `PluginOutput` schemas (JSON Schema Draft 2020-12) are immutable within a major version. New optional inputs may be added, but required inputs cannot be introduced without a breaking change.

### 1.3 CI Workflow Inputs

- **Definition:** Inputs, parameters, and environment variables consumed by reusable GitHub Actions workflows (e.g., Cyber Resilience CI, ACG validation).
- **Contract:** Required inputs cannot be added or removed in minor/patch releases. Any change to the semantic meaning of an existing input constitutes a breaking change.

## 2. Versioning Guidance

We strictly adhere to [Semantic Versioning 2.0.0](https://semver.org/).

- **MAJOR (X.y.z):** Introduced when making incompatible API or schema changes. Examples: Removing a field from a Retriever API, changing a Query Planner Plugin interface, making an optional CI workflow input required.
- **MINOR (x.Y.z):** Introduced when adding functionality in a backward-compatible manner. Examples: Adding a new optional parameter to a Retriever API, adding a new Query Planner Plugin, introducing a new optional CI workflow input.
- **PATCH (x.y.Z):** Introduced when making backward-compatible bug fixes. Examples: Fixing a typo in a log message, optimizing a query without changing its output structure.

## 3. Changelog Discipline

All changes to the core interfaces must be documented in the repository's main `CHANGELOG.md` (or the component-specific changelog, if applicable).

- **Format:** We follow the [Keep a Changelog](https://keepachangelog.com/) format.
- **Categorization:** Changes must be categorized under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`.
- **Breaking Changes:** Must be explicitly highlighted in the changelog entry with a **BREAKING CHANGE** prefix and a clear migration path.
- **PR Requirement:** Pull requests modifying any core interface must include an update to the changelog.

## 4. Deprecation Warnings in CI for Breaking Changes

To ensure consumers are aware of upcoming breaking changes and have adequate time to migrate, we enforce a deprecation period and CI warnings.

- **Deprecation Period:** A feature or interface element must be marked as deprecated for at least one full minor release cycle before it can be removed in a major release.
- **CI Warnings:**
  - If a consumer utilizes a deprecated API field, plugin input, or CI workflow parameter, the CI pipeline must emit a clear, non-fatal warning.
  - The warning must include the version in which the feature will be removed and a link to the migration guide.
  - Example GitHub Actions warning annotation: `::warning file={file},line={line}::[DEPRECATION] The input 'legacy_param' is deprecated and will be removed in v3.0.0. Use 'new_param' instead. See: {link-to-migration-guide}`
- **Test Enforcement:** Our integration tests must verify that these warnings are correctly emitted when deprecated code paths are exercised.

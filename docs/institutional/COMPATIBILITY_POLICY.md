# Compatibility & Deprecation Policy

To ensure institutional durability, the platform adheres to strict stability guarantees. Organizations build long-term processes on top of this infrastructure; we respect that investment by minimizing churn.

## 1. Versioning Strategy

We follow **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

*   **MAJOR**: Incompatible API changes.
*   **MINOR**: Functionality added in a backward-compatible manner.
*   **PATCH**: Backward-compatible bug fixes.

### "Public API" Definition
The Public API consists of:
1.  GraphQL Schema & REST Endpoints documented in OpenAPI specs.
2.  Plugin SDK interfaces.
3.  Configuration file schemas (YAML/JSON).
4.  Standard Data Export formats (CSV, JSON-Lines).

Internal code structures, database schemas (direct access), and undocumented routes are **not** part of the public contract.

---

## 2. Change Stability Promises

### Backward Compatibility
*   **Minor Versions:** We guarantee 100% backward compatibility for the Public API within the same Major version.
*   **Database:** We provide migration scripts for all schema changes. Data loss is never an acceptable side effect of an upgrade.

### Deprecation Timeline
When a feature or API must be removed:

1.  **Announcement:** Deprecation is announced in release notes of a MINOR version.
2.  **Warning Period:** The feature operates with warnings (logs/headers) for at least **6 months** or **2 minor versions**, whichever is longer.
3.  **Removal:** The feature is removed in the next MAJOR version.

### Breaking Changes (Major Version)
Major version upgrades may require:
*   Manual migration steps (documented).
*   Updates to plugin code.
*   Configuration format changes.

We strive to limit Major releases to once every 12-18 months to ensure stability.

---

## 3. Data Longevity

We guarantee that data created today will be readable by platform versions released 5 years from now.

*   **Export Formats:** We prioritize open, text-based formats (JSON, CSV, SQL) over proprietary binaries.
*   **Schema Evolution:** The core domain model is additive. We do not delete columns/fields unless they are purely transient caches.

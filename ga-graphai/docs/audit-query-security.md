# Audit Investigation Platform Security Overview

## Overview

The audit investigation platform unifies cursor provenance and simple ledger audit data to enable
natural-language driven investigations. It introduces hardened controls for temporal reconstruction,
cross-system correlation, anomaly surfacing, and export workflows. Security was prioritized in the
following areas:

- **Defense-in-depth:** role-scoped capabilities control querying, anomaly visibility, and export
  permissions. Unauthorized attempts are rejected with deterministic errors.
- **Operational safeguards:** a signed investigation trail records every query invocation (including
  cache hits) with investigator identity, options, and result summaries.
- **Data minimization:** ledger adapters normalize metadata, remove direct system identifiers from
  payloads, and deduplicate correlation identifiers before use.

## Role-based access controls

- `viewer` roles may query the platform but cannot export or inspect anomaly outputs.
- `analyst` roles may query, export, and review anomaly insights to accelerate investigations.
- `admin` inherits all capabilities and may be extended with additional overrides.
- Unauthorized access attempts raise explicit errors, ensuring calling services can enforce break-glass
  flows or alerting policies.

## Query execution and caching

- Cached query responses are validated for freshness before reuse. Expired entries are purged
  proactively and when new results are written.
- Cached results are deep-cloned on retrieval to prevent in-memory mutation of canonical findings.
- Cache size and TTL are configurable, enabling operators to align with retention requirements.

## Anomaly detection and correlation

- Anomaly detection thresholds are tunable per deployment, allowing environment-specific baselines.
- Correlation logic requires multiple systems or repeated hits before exposing keys, reducing the
  risk of leaking single-system identifiers.
- Natural language parsing sanitizes recognized tokens and normalizes timestamps to mitigate injection
  of unbounded filters.

## Export governance and audit trail

- Export payloads require explicit authorization and are serialized in CSV or JSON with escaping to
  prevent spreadsheet formula injection.
- Each investigation trail entry captures tenant, user, session, filter, options, and aggregate metrics.
  The trail is bounded (default 200 entries) to limit in-memory exposure while preserving forensic value.
- Timeline visuals are generated deterministically and contain no uncontrolled user input beyond the
  sanitized event metadata.

## Integration and testing

- Ledger adapters translate provenance events into normalized audit records, ensuring consistent
  severity mapping and correlation identifiers across systems.
- Vitest coverage validates natural language queries, caching, RBAC enforcement, anomaly visibility,
  and investigation trail population using both ledger sources.
- The platform is production-ready with deterministic behaviour, configuration escape hatches, and
  documentation to support security review and deployment.

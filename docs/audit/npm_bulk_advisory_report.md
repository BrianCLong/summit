# NPM bulk advisory report

- Generated: 2026-02-08T04:27:38.672979+00:00
- Lockfile: `/media/bcl/SUMMIT_LNX/summit/pnpm-lock.yaml`
- Advisories: 21
- Packages with advisories: 17
- Affected versions: 24
- Affected importers: 50

## @apollo/server
- Apollo Serve vulnerable to Denial of Service with `startStandaloneServer` (high)
  - ID: 1112926
  - Range: `>=5.0.0 <5.4.0`
  - Affected versions: 5.2.0
  - Importers: packages/api-framework, server, services/api-gateway
  - Recommended: Upgrade to a version outside the vulnerable range (>=5.0.0 <5.4.0).
- Apollo Serve vulnerable to Denial of Service with `startStandaloneServer` (high)
  - ID: 1112927
  - Range: `>=4.2.0 <4.13.0`
  - Affected versions: 4.12.2
  - Importers: apps/gateway, apps/intelgraph-api, apps/server, companyos/services/tenant-api, packages/rate-limiter, services/admin-api, services/admin-automation, services/battle-api, services/config-service, services/control-tower-service, services/data-monetization-engine, services/digital-twin, services/graph-core, services/sandbox-gateway
  - Recommended: Upgrade to a version outside the vulnerable range (>=4.2.0 <4.13.0).

## @isaacs/brace-expansion
- @isaacs/brace-expansion has Uncontrolled Resource Consumption (high)
  - ID: 1112954
  - Range: `<=5.0.0`
  - Affected versions: 5.0.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (<=5.0.0).

## @modelcontextprotocol/sdk
- @modelcontextprotocol/sdk has cross-client data leak via shared server/transport instance reuse (high)
  - ID: 1112952
  - Range: `>=1.10.0 <=1.25.3`
  - Affected versions: 1.25.2
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=1.10.0 <=1.25.3).

## @orval/core
- Orval has Code Injection via unsanitized x-enum-descriptions using JS comments (critical)
  - ID: 1112712
  - Range: `>=7.19.0 <7.21.0`
  - Affected versions: 7.20.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=7.19.0 <7.21.0).

## apollo-server
- Apollo Serve vulnerable to Denial of Service with `startStandaloneServer` (high)
  - ID: 1112928
  - Range: `>=2.0.0 <=3.13.0`
  - Affected versions: 3.13.0
  - Importers: services/prov-ledger
  - Recommended: Upgrade to a version outside the vulnerable range (>=2.0.0 <=3.13.0).

## aws-sdk
- JavaScript SDK v2 users should add validation to the region parameter value in or migrate to v3 (low)
  - ID: 1111997
  - Range: `>=2.0.0 <=3.0.0`
  - Affected versions: 2.1693.0
  - Importers: packages/tasks-core
  - Recommended: Upgrade to a version outside the vulnerable range (>=2.0.0 <=3.0.0).

## dicer
- Crash in HeaderParser in dicer (high)
  - ID: 1093150
  - Range: `<=0.3.1`
  - Affected versions: 0.3.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (<=0.3.1).

## diff
- jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch (low)
  - ID: 1112703
  - Range: `<3.5.1`
  - Affected versions: 3.5.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (<3.5.1).
- jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch (low)
  - ID: 1112704
  - Range: `>=4.0.0 <4.0.4`
  - Affected versions: 4.0.2
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=4.0.0 <4.0.4).
- jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch (low)
  - ID: 1112706
  - Range: `>=6.0.0 <8.0.3`
  - Affected versions: 8.0.2
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=6.0.0 <8.0.3).

## elliptic
- Elliptic Uses a Cryptographic Primitive with a Risky Implementation (low)
  - ID: 1112030
  - Range: `<=6.6.1`
  - Affected versions: 6.6.1
  - Importers: packages/blockchain, packages/digital-signatures
  - Recommended: Upgrade to a version outside the vulnerable range (<=6.6.1).

## fast-xml-parser
- fast-xml-parser has RangeError DoS Numeric Entities Bug (high)
  - ID: 1112708
  - Range: `>=4.3.6 <=5.3.3`
  - Affected versions: 4.5.3, 5.2.5
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=4.3.6 <=5.3.3).

## fastify
- Fastify Vulnerable to DoS via Unbounded Memory Allocation in sendWebStream (low)
  - ID: 1112876
  - Range: `<=5.7.2`
  - Affected versions: 4.29.1, 5.6.2
  - Importers: packages/prov-ledger, prov-ledger-service, services/agent-runtime, services/agentic-mesh-evaluation, services/ai-sandbox, services/ai-service-platform, services/bundle-pipeline-service, services/collaboration-service, services/data-factory-service, services/data-marketplace, services/data-pool, services/decision-api, services/distributed-registry, services/entity-resolution, services/etl-service, services/feature-flags, services/health-aggregator, services/labeling-service, services/license-registry, services/media-pipeline-service, services/policy-aware-cache, services/policy-engine, services/receipt-signer, services/secure-elections, services/streaming-ingest, services/sync-service, services/unified-audit, services/universal-ingestion
  - Recommended: Upgrade to a version outside the vulnerable range (<=5.7.2).
- Fastify's Content-Type header tab character allows body validation bypass (high)
  - ID: 1112877
  - Range: `<5.7.2`
  - Affected versions: 4.29.1, 5.6.2
  - Importers: packages/prov-ledger, prov-ledger-service, services/agent-runtime, services/agentic-mesh-evaluation, services/ai-sandbox, services/ai-service-platform, services/bundle-pipeline-service, services/collaboration-service, services/data-factory-service, services/data-marketplace, services/data-pool, services/decision-api, services/distributed-registry, services/entity-resolution, services/etl-service, services/feature-flags, services/health-aggregator, services/labeling-service, services/license-registry, services/media-pipeline-service, services/policy-aware-cache, services/policy-engine, services/receipt-signer, services/secure-elections, services/streaming-ingest, services/sync-service, services/unified-audit, services/universal-ingestion
  - Recommended: Upgrade to a version outside the vulnerable range (<5.7.2).

## html-minifier
- kangax html-minifier REDoS vulnerability (high)
  - ID: 1105440
  - Range: `<=4.0.0`
  - Affected versions: 4.0.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (<=4.0.0).

## lodash
- Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions (moderate)
  - ID: 1112455
  - Range: `>=4.0.0 <=4.17.22`
  - Affected versions: 4.17.21
  - Importers: server
  - Recommended: Upgrade to a version outside the vulnerable range (>=4.0.0 <=4.17.22).

## lodash-es
- Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions (moderate)
  - ID: 1112453
  - Range: `>=4.0.0 <=4.17.22`
  - Affected versions: 4.17.21
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (>=4.0.0 <=4.17.22).

## mjml
- MJML allows mj-include directory traversal due to an incomplete fix for CVE-2020-12827 (moderate)
  - ID: 1111537
  - Range: `<=4.18.0`
  - Affected versions: 4.18.0
  - Importers: server
  - Recommended: Upgrade to a version outside the vulnerable range (<=4.18.0).

## pkg
- Pkg Local Privilege Escalation (moderate)
  - ID: 1096454
  - Range: `<=5.8.1`
  - Affected versions: 5.8.1
  - Importers: cli
  - Recommended: Upgrade to a version outside the vulnerable range (<=5.8.1).

## undici
- Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion (moderate)
  - ID: 1112496
  - Range: `<6.23.0`
  - Affected versions: 5.29.0
  - Importers: None
  - Recommended: Upgrade to a version outside the vulnerable range (<6.23.0).


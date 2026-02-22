# Reversible State Store (RSS) Retention Policy

## Overview
The Reversible State Store (RSS) provides content-addressed snapshots of collected OSINT artifacts. To manage storage costs and maintain performance, the following retention policy is enforced.

## Retention Tiers

### Tier 1: Active Investigations
- **Scope**: All snapshots related to open cases or active monitoring jobs.
- **Retention**: Indefinite (until case is closed or monitoring job is deactivated).
- **Storage**: High-performance NVMe.

### Tier 2: Recent History
- **Scope**: Snapshots not associated with an active case, but collected within the last 90 days.
- **Retention**: 90 days.
- **Storage**: Standard SSD.

### Tier 3: Archive
- **Scope**: Snapshots older than 90 days.
- **Retention**: 1 year.
- **Storage**: Cold storage (S3 Glacier or equivalent).
- **Access**: On-demand retrieval (latency up to 4 hours).

## Deletion and Purge
- After 1 year, Tier 3 snapshots are permanently purged unless explicitly flagged for legal hold.
- Every purge event must generate a **Deletion Proof** (hash of the purged content + signed timestamp) recorded in the Provenance Ledger.

## Deduplication
- RSS uses content-addressed storage (SHA-256). Identical content across different investigations or vantages will only be stored once.
- Retention is calculated based on the *most recent* reference to the content.

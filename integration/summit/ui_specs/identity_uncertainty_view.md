# UI Spec: Identity Uncertainty View (CIRW)

## Purpose

Provide analysts with cluster candidates, confidence intervals, and witness evidence in a single
view.

## Layout

- **Cluster Summary Panel:** cluster ID, confidence interval, uncertainty score.
- **Evidence Panel:** minimal support set with feature hashes and evidence metadata.
- **Policy Panel:** policy decision ID and scope constraints.
- **Actions:** merge/split recommendation toggles (policy-gated).

## UX Requirements

- Highlight low-confidence clusters in amber.
- Provide quick filter for minimum confidence threshold.
- Surface witness ledger verification status.

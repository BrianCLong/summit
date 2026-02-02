# Governance Policy Gate

## Purpose

The governance layer is a deny-by-default policy gate independent of any model provider. It
produces structured allow/deny/modify decisions with policy references and explanations.

## Policy Categories

- Legal and jurisdictional constraints
- Platform policy
- Ethics and brand safety
- Security and abuse prevention

## Core Guarantees

- Deny-by-default for external publishing without human approval.
- Allow simulate-only interventions.
- Every decision produces a provenance-linked audit event.

## Audit & Evidence

- Decisions reference policy bundle hashes.
- Interventions are signed by agent metadata and snapshot hashes.

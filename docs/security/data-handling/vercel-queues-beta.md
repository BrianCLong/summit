# Vercel Queues Beta: Data Handling & Classification

## Overview

This document outlines the security and data handling policies for the Vercel Queues (public beta) integration within Summit.

## Never Log Policy

The following data elements must **never** be logged during enqueue, execution, or processing phases:

- Access tokens or authentication credentials
- Payload Personally Identifiable Information (PII)
- Idempotency secrets or salts

## Retention Policy

- **Job metadata**: 30 days maximum retention.
- **Evidence artifacts**: Governed by the standard Summit retention policy (typically longer for auditability, but devoid of PII).

## Governance Guardrails

All execution through the Vercel Queue provider must pass through the Summit governance layer to enforce:

- Cost/budget per job limits
- Retry caps to prevent infinite loops
- Idempotency checks to prevent duplicate execution

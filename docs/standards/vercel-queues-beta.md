# Vercel Queues Beta: Standards Mapping

## Overview

This document maps Summit standards to the Vercel Queues public beta implementation.

## Mapping

| Standard            | Mapping                                                          |
| :------------------ | :--------------------------------------------------------------- |
| **Async job model** | Handled via the `QueueProvider` abstraction (QPI)                |
| **Evidence model**  | Handled via the standard Summit schema (deterministic artifacts) |
| **Retry semantics** | Governed by the central policy and execution governor            |

## Non-Goals

- We are **not** replacing the internal pipeline engine.
- We are **not** bypassing the governance layer. Vercel Queues are treated as an untrusted execution environment that must be governed.

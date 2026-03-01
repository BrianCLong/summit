# Cohere Subsumption Interoperability & Standards

## Overview
This document maps how Summit incorporates and governs agents and RAG based on Cohere’s public product positioning constraints.

## Import Surface
* Function-calling style plans (Agents)
* Embedding-based retrieval operations (RAG)

## Export Surface
All outputs must be strictly deterministic and machine-verifiable:
* Structured evidence JSON (`EVID-<component>-<hash8>`)
* `metrics.json`
* Deterministic run hash in `stamp.json`

## Non-Goals
We subsume the orchestration layer, not the raw infrastructure. The following are explicitly out of scope:
* Model hosting layer implementation
* Vector database or retrieval index low-level implementation

## Positioning Constraints
* We claim deterministic, CI-verifiable orchestration and governance-first RAG evaluation.
* We DO NOT claim model/hosting scale parity.

# Optimization Loop Catalog

This document outlines the approved, low-risk optimization loops that the system can autonomously execute. Each loop has a clear objective, a defined set of allowed actions, and a list of components or parameters that it is explicitly forbidden to modify.

## 1. Cost Optimization: Prompt Compaction

- **Objective:** Reduce token consumption and associated costs by compacting prompts sent to large language models.
- **Allowed Actions:**
  - Remove extraneous whitespace and formatting.
  - Replace low-information words or phrases with shorter equivalents (e.g., "in order to" -> "to").
  - Summarize conversational history beyond a certain token window.
- **"Never Touch" List:**
  - User-provided keywords or quoted text.
  - System instructions that define output format (e.g., JSON schemas).
  - Code snippets or formatted data within the prompt.

## 2. Reliability Optimization: Retry Backoff Tuning

- **Objective:** Improve service reliability by dynamically adjusting the backoff strategy for retrying failed API calls.
- **Allowed Actions:**
  - Increase or decrease the base delay for exponential backoff.
  - Introduce jitter to the backoff delay to prevent "thundering herd" problems.
  - Adjust the maximum number of retries for specific error types (e.g., `503 Service Unavailable`).
- **"Never Touch" List:**
  - Retry settings for idempotent operations (these should be retried aggressively).
  - Services that have explicitly disabled retries.
  - Authentication or authorization-related API calls.

# Agent Runtime Data Handling

## Overview
Outlines the operational boundaries and data retention policies for the Summit Agentic orchestration runtime and evidence generation pipeline.

## Data Classification
* **Public**: Marketing content or public repos
* **Internal**: General logic steps, generic tool execution statuses
* **Confidential**: RAG retrieved items that might contain PII, or raw prompt text
* **Restricted**: Tool API Keys, credentials

## Never Log Fields
The following fields must strictly NEVER be logged or sent to unapproved destinations:
* Raw prompt text (if marked sensitive)
* Secrets
* Tool API keys
* Classified retrieval chunks

## Retention Policy
* Agent runtime and policy artifacts (evidence, metrics) are retained for **30 days**.
* Policy violation logs are retained for **90 days**.

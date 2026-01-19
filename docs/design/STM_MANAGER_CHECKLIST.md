---
title: STM Manager Implementation Checklist
summary: Compact Summit-ready checklist for Short-Term Memory (STM) manager strategies, tools, and governance.
version: 1.0.0
lastUpdated: 2026-01-14
owner: agents
status: draft
---

# STM Manager Implementation Checklist

**Status:** Draft
**Context:** Short-Term Memory (STM) Management for AI Agents
**Goal:** Implement effective compression strategies to maintain context window efficiency while preserving decision integrity.

## 1. Core Strategies (Heuristic & Rule-Based)

- [ ] **Heuristic Trimming Policy**
  - [ ] Implement `keep_last_n_turns(N)` rule (retain recent interactions).
  - [ ] Implement `keep_system_messages()` rule (retain critical instructions).
  - [ ] Implement `filter_low_value_tokens()` (remove old greetings, redundant confirmations).
- [ ] **LLM Summarization Engine**
  - [ ] Implement `periodic_summary(segment_length)` (summarize every K turns).
  - [ ] Implement `hierarchical_summary()` (summarize summaries for long-running sessions).
- [ ] **Observation Masking**
  - [ ] Implement `mask_repetitive_logs()` (replace "10 similar lines" with placeholders).
  - [ ] Implement `state_change_only()` (only record outcome/state changes, discard verbose output).

## 2. Learned & Optimized Compression

- [ ] **Agent Context Optimization (Acon)**
  - [ ] Implement data-driven guideline updates based on failure analysis.
  - [ ] Create feedback loop: `failure -> context analysis -> guideline refinement`.
- [ ] **Tool-Based STM Management (AgeMem)**
  - [ ] Expose `stm_summarize()` tool to agent.
  - [ ] Expose `stm_filter()` tool to agent.
  - [ ] Expose `stm_clear()` tool to agent.
  - [ ] Train/Prompt agent on policy for invoking these tools.

## 3. Structural Techniques

- [ ] **Topical & Phase Bucketing**
  - [ ] Implement `current_phase_detail()` (keep raw detail for active phase).
  - [ ] Implement `prior_phase_summary()` (collapse previous phases to summaries).
- [ ] **Entity/Graph Extraction**
  - [ ] Implement `extract_entities()` (users, files, services).
  - [ ] Implement `graph_injection()` (inject relevant subgraph based on current context).

## 4. Governance & Evaluation

- [ ] **Context Lifecycle Loop (Write-Select-Compress-Isolate)**
  - [ ] Define policy: **When to Write** (commit to memory).
  - [ ] Define policy: **What to Select** (retrieval criteria).
  - [ ] Define policy: **How to Compress** (summarization vs. trimming).
  - [ ] Define policy: **Isolation** (thread separation).
- [ ] **Compression Evaluation Framework**
  - [ ] Create test suite: `run_with_full_context` vs `run_with_compressed_context`.
  - [ ] Measure `prompt_length_reduction` (Target: 3-5%).
  - [ ] Measure `performance_loss` (Target: 0%).
  - [ ] Analyze failures (hallucinations, lost constraints).

## 5. Metrics & Success Criteria

- [ ] **Token Efficiency:** % reduction in prompt tokens per task.
- [ ] **Decision Fidelity:** % of tasks completed successfully with compressed context vs full.
- [ ] **Latency:** Time saved in prompt processing.
- [ ] **Cost:** Token cost reduction.

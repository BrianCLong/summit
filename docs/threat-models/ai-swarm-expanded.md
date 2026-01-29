# Summit Adversarial Model: AI Swarm & Disinformation Systems

## 1. Overview

This document extends the Summit Threat Model to specifically address AI-driven disinformation swarms. It moves beyond simple botnet definitions to characterize "systems-of-systems" failure modes where adversaries employ adaptive, persistent, and coordinated AI agents.

## 2. AI Swarm Actor Classes

### 2.1. Sleeper-Identity Swarms

* **Definition:** Collections of synthetic identities that build credibility over long periods (months/years) through benign activity before activation.
* **Behavior:** "Aging in" accounts, replicating human diurnal patterns, interacting with non-political content to build 'normie' graphs.
* **Goal:** Evade "new account" filters and establish trust scores high enough to bypass initial scrutiny during attack phases.

### 2.2. Narrative Shepherds

* **Definition:** High-capability agents (LLM-backed) that don't just amplify, but *steer* conversations.
* **Behavior:** They monitor comment threads and inject nuanced pivots (not just repetition) to guide public sentiment toward specific emotional states or conclusions.
* **Goal:** Maintain narrative momentum and prevent natural de-escalation of outrage.

### 2.3. Synthetic Consensus Forgers

* **Definition:** Swarms designed to create the illusion of majority agreement (Astroturfing 2.0).
* **Behavior:** Rapid, multi-modal validation of specific claims. They don't just "like"; they quote-tweet, remix, and cross-reference each other to create a dense, self-referential citation graph.
* **Goal:** Trigger "social proof" heuristics in human targets and algorithmic amplification in platform recommendation engines.

### 2.4. Training-Data Poisoners

* **Definition:** Agents that seed the open web with specific semantic payloads designed to be ingested by future LLM training runs.
* **Behavior:** Generating high-volume, authoritative-sounding text with subtle, embedded biases or factual distortions, often on long-tail websites or forums.
* **Goal:** Long-term corruption of the "source of truth" for future AI models.

## 3. Tactics, Techniques, and Procedures (TTPs)

### 3.1. Cross-Platform Identity Persistence

* **TTP:** Maintaining consistent personas across Twitter, Reddit, Discord, and Telegram.
* **Mechanism:** Shared bio-markers, visual styles, and linguistic fingerprints (idiolects) managed by a central state engine.
* **Detection Signal:** Improbable coherence of profile updates across disparate platforms within tight time windows.

### 3.2. Temporal Coordination (Asynchronous)

* **TTP:** Swarming without simultaneous bursting.
* **Mechanism:** Agents are given a "campaign window" and a "volatility budget," engaging stochastically rather than all at once.
* **Detection Signal:** "Smoothed" traffic patterns that lack natural organic spikes but maintain unnatural sustained pressure (Flat-topping).

### 3.3. Narrative Mutation & Semantic Preservation

* **TTP:** Avoiding keyword filters by preserving semantic intent while varying syntax and vocabulary.
* **Mechanism:** Using LLMs to paraphrase a core "Claim" into thousands of unique surface forms (tweets, posts).
* **Detection Signal:** High semantic vector clustering with low lexical n-gram overlap (The "Parrot Paradox").

### 3.4. Adaptive Engagement Probing

* **TTP:** Testing defense thresholds.
* **Mechanism:** Swarms launch "probe" waves at varying intensities and content toxicities to map the platform's moderation response curves, then retreat to just below the enforcement threshold.
* **Detection Signal:** Oscillating "sawtooth" patterns of policy violations followed by immediate behavioral corrections.

## 4. Graph-Native Threat Ontology

These behaviors manifest as distinct topological structures in the interaction graph.

* **The clique:** Dense inter-connectivity (Forgers).
* **The Star/Hub:** Central coordination nodes (Shepherds).
* **The Chain:** Linear quote-chains to boost visibility.
* **The Bridge:** Connecting disparate communities to spread contagion.

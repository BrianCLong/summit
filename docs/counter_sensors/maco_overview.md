# Multi-Agent Counter-Sensor Orchestrator (MACO)

## Overview
MACO is a foundational subsystem within Summit designed to treat adversarial assets and campaigns as heterogeneous "counter-sensors." It operates under a strictly defensive and protective counterintelligence posture. MACO monitors and fuses behaviors of these adversarial actors into Summit’s own risk and collection posture while simultaneously hardening its multi-agent AI and GraphRAG stack against potential adversarial exploitation.

## Core Components

1. **Counter-Sensor Graph & Coverage Model**
   - Treats each adversarial asset/campaign as an untrusted sensor node providing partial, noisy coverage over parts of the narrative graph.
   - Computes coverage overlaps, identifying redundancy and critical blind spots (communities or relationship types with weak or entirely deceptive coverage).

2. **Multi-Agent Counter-Exploit Harness**
   - An in-process, non-networked testing harness.
   - Executes scripted adversarial scenarios—such as Multi-hop GraphRAG Poisoning, Graphemic Text Perturbations, and Prompt Jailbreak Probes—against Summit's multi-agent stack.
   - Measures system responses and outputs `ScenarioExecutionRecord`s tied to specific CI risks, without mutating production artifacts.

3. **Counter-Sensor Posture Fusion**
   - Analyzes sensor coverage overlaps alongside output logs from the harness.
   - Generates a dynamic Posture Rating (`GREEN`, `AMBER`, `RED`) highlighting areas within the narrative graph where coverage is weak or heavily deceptive, or where the AI stack is uniquely vulnerable to targeted probes.

## Commander's Intent
This subsystem closes a critical CI gap by dynamically quantifying where adversarial knowledge structures possess asymmetric advantages over our sensors, and continuously measuring our AI stack's vulnerability to exploitation (hallucinations, poisoning, jailbreaks) in real-time. It transforms passive defense into a continuously self-calibrating multi-agent counter-sensor network.

## Abuse Analysis
**Misuse Potential:** The coverage and scoring models could theoretically be misused to profile communities for offensive targeting by identifying weak points in adversary operational security.
**Constraint/Design:** MACO is architected with a strictly defensive CI framing. It provides situational awareness exclusively. It does not perform automatic blocking, triage, or policy enforcement, and offers no interfaces or operational hooks for active offensive execution or recruitment. The harness is limited to an internal-only testbed context without production graph mutations.

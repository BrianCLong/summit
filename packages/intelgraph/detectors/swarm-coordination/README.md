# Swarm Coordination Detector

## Overview

This package implements the "Coordination Physics" detection engine for the IntelGraph platform. It identifies synthetic coordination patterns by analyzing graph topology, temporal entropy, and semantic drift.

## Detection Modules

### 1. Entropy Analyzer

Calculates the Shannon entropy of event inter-arrival times for specific narratives or hashtags. Low entropy indicates automation.

### 2. Semantic Drift Calculator

Computes the `semantic_lexical_divergence` metric to identify LLM-generated paraphrasing swarms (High Embedding Similarity / Low N-Gram Overlap).

### 3. Topological Clusterer

Identifies dense subgraphs (cliques) that exhibit high "lockstep" behavior in temporal activation.

## Interface

```typescript
interface SwarmDetectionRequest {
  windowStart: Date;
  windowEnd: Date;
  narrativeId?: string;
  actorIds?: string[];
}

interface SwarmDetectionResult {
  swarmId: string;
  confidence: number; // 0.0 - 1.0
  signals: {
    entropy: number;
    drift: number;
    topology: number;
  };
  actors: string[];
  evidence: EvidenceReference[];
}
```

## Usage

This module is designed to run as a sidecar or scheduled job within the IntelGraph processing pipeline. It consumes the `InteractionGraph` and emits `ThreatSignal` events.

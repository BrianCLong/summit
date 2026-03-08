# Canonical Graph Contract v1

This document defines the versioned ontology and graph primitives for Summit.
All graph entities must adhere to these definitions to ensure data governance, provenance, and interoperability.

## Graph Primitives

### 1. Entity
A distinct real-world or logical object.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

### 2. Event
A temporal occurrence involving one or more Entities.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

### 3. Relationship
A directed or undirected connection between two Entities.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

### 4. Evidence
A verified artifact or source that corroborates a Claim.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

### 5. Claim
An assertion made by a system or agent based on Evidence.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

### 6. Narrative
A higher-level structure synthesizing Claims and Relationships into a cohesive whole.
- **Required Fields:** `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`

## Graph-as-SoR Rule
No "final outputs" are permitted without writing structured artifacts to the graph. Every claim must trace back to its source evidence.

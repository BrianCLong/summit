# AI-Enabled Influence Campaign Ontology

This document outlines the standard ontology designed to represent and model AI-enabled influence campaigns within Summit. The structure acts similarly to the MITRE ATT&CK framework, but tailored specifically for analyzing the evolving landscape of information operations, state-aligned active measures, and criminal disinformation efforts.

## Purpose

Generative AI is fully operationalized by malicious actors—from state APTs to criminal syndicates and terrorist organizations. AI reduces the labor cost of influence campaigns significantly, turning "influence" from a media production problem into an automated relationship and infrastructure problem. This ontology serves to map actor operations against targeted narratives, AI tooling usage, synthetic personas, and amplification tactics.

## Scope

The schema provides the backbone for tracking operations such as:
- Reconnaissance and Targeting
- Persona Fabrication
- Narrative Development
- Amplification and Swarming

It acts as an evidence-linked graph structure for the Summit platform.

## Key Relationships

The fundamental relationships within the ontology form an evidence-based graph:
- **Campaign** -> `SPONSORS` -> **Actor**
- **Campaign** -> `USES_TACTIC` -> **Tactic**
- **Tactic** -> `REALIZED_BY` -> **Technique**
- **Campaign** -> `PROMOTES` -> **Narrative**
- **Campaign** -> `DEPLOYS` -> **Persona**
- **Persona** -> `OPERATES` -> **Account**

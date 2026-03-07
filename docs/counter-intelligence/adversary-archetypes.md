# Adversary Archetypes

This document defines the canonical, non-speculative adversary archetypes that Summit is designed to detect and counter. These archetypes are defined by their observable behaviors, not their identities or motivations, allowing for a defensive response that is not predicated on definitive attribution.

## Core Principle

> _You cannot defend against what you cannot model. You cannot model what you refuse to name._

By formalizing these behavioral archetypes, Summit makes adversarial behavior legible and allows for the development of targeted, evidence-based defensive measures.

## Canonical Adversary Classes

The following five archetypes represent the primary classes of adversarial behavior that Summit's counter-intelligence features are designed to address.

### 1. Poisoners

- **Behavior**: Degrade the quality and reliability of data and analytical inputs. Poisoners aim to corrupt the foundational information upon which decisions are made, introducing subtle inaccuracies or misleading data that undermines the integrity of the entire analytical process.
- **Observable Signals**:
  - Anomalous data entries that contradict established patterns.
  - Gradual degradation of data sources that were previously reliable.
  - Introduction of seemingly plausible but ultimately false information.
- **Defensive Goal**: Ensure data integrity and provenance, flagging and isolating suspect information before it can contaminate analysis.

### 2. Narrativists

- **Behavior**: Shape the interpretation and explanation of events, rather than manipulating the raw facts. Narrativists focus on controlling the story that emerges from the data, influencing how information is understood and contextualized to favor a particular outcome.
- **Observable Signals**:
  - Coordinated promotion of a specific interpretation across multiple channels.
  - The emergence of a compelling narrative that is not fully supported by the available evidence.
  - Attempts to discredit alternative explanations or competing narratives.
- **Defensive Goal**: Maintain a clear distinction between evidence and interpretation, surfacing multiple plausible hypotheses and highlighting where narratives may be diverging from the facts.

### 3. Impersonators

- **Behavior**: Forge or co-opt authority, provenance, or identity to lend false credibility to information or directives. Impersonators seek to exploit trust in established sources or individuals to legitimize their actions or disseminate misinformation.
- **Observable Signals**:
  - Communications or data that are subtly inconsistent with the known behavior of the purported source.
  - Use of forged credentials or compromised accounts.
  - Claims of authority or access that cannot be verified through established channels.
- **Defensive Goal**: Rigorously verify identity and provenance, ensuring that all information and directives are attributable to a trusted and authenticated source.

### 4. Accelerators

- **Behavior**: Force premature decisions or conclusions by creating a false sense of urgency or by manipulating the perceived timeline of events. Accelerators aim to rush the decision-making process, preventing thorough analysis and increasing the likelihood of unforced errors.
- **Observable Signals**:
  - Sudden influx of alarming but unverified information.
  - Artificial deadlines or pressure for an immediate response.
  - Manipulation of information to suggest that a critical window for action is closing.
- **Defensive Goal**: Impose a structured, deliberate pace on the decision-making process, ensuring that all necessary analytical steps are completed before a conclusion is reached.

### 5. Fragmenters

- **Behavior**: Increase internal disagreement, paralysis, and the cost of coordination. Fragmenters seek to sow division and distrust within an organization, making it difficult to reach consensus or take decisive action.
- **Observable Signals**:
  - Amplification of minor disagreements into major disputes.
  - Introduction of polarizing or emotionally charged information.
  - Disruption of established communication and coordination channels.
- **Defensive Goal**: Foster a resilient and high-trust decision-making environment, providing tools and processes that facilitate constructive disagreement and rapid consensus-building.

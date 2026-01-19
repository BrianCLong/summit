# Narrative Engineering & Counter-Campaign Design Epics

## Summit Readiness Assertion

This plan is governed by the Summit Readiness Assertion and must remain aligned with the
repository-wide readiness guarantees and verification posture. See
`docs/SUMMIT_READINESS_ASSERTION.md`.

## Authority & Alignment

All artifacts and definitions in this document align to the following authority files:

- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `docs/ONTOLOGY_AND_SCHEMA_GOVERNANCE.md`
- `docs/API_SCHEMA_GOVERNANCE_V0.md`
- `docs/SUMMIT_READINESS_ASSERTION.md`

## Epic Summary

| Epic ID | Capability                                        | Objective                                                                                                                      | Status      |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| F1      | Narrative Structure Graph Layer                   | Represent master narratives, sub-narratives, and story elements as graph entities linked to content for story-logic reasoning. | not-started |
| F2      | Doctrine-Aware Playbooks                          | Encode IO/narrative doctrine as reusable playbooks that parameterize counter-campaign responses.                               | not-started |
| F3      | Counter-Campaign Templates & Simulation Workbench | Provide scenario-ready templates and simulation loops to test counter-narratives and measure effects.                          | not-started |

## Epic F1: Narrative Structure Graph Layer

### Objective

Model narrative structure directly in Neo4j so analysts can reason at the story-logic layer
(actors, causal arcs, narrative motifs) instead of only at the topical layer.

### Scope

- Graph entities for master narratives, sub-narratives, and story elements.
- Links to content, entities, and events for traceable provenance.
- Analyst workflows for building and querying narrative graphs.

### Proposed Neo4j Schema

**Node labels**

- `Narrative` (master narrative)
- `SubNarrative`
- `StoryElement`
- `CausalArc`
- `NarrativeRole` (hero, villain, victim, instigator)
- `NarrativeClaim`

**Relationships**

- `(Narrative)-[:HAS_SUBNARRATIVE]->(SubNarrative)`
- `(SubNarrative)-[:HAS_ELEMENT]->(StoryElement)`
- `(StoryElement)-[:PLAYS_ROLE]->(NarrativeRole)`
- `(StoryElement)-[:IN_ARC]->(CausalArc)`
- `(NarrativeClaim)-[:SUPPORTED_BY]->(Content)`
- `(Content)-[:MENTIONS]->(Entity)`
- `(StoryElement)-[:LINKED_EVENT]->(Event)`

**Key properties**

- `Narrative{ narrativeId, name, description, doctrineRef, confidence, provenanceRef }`
- `StoryElement{ elementId, type, polarity, intent, evidenceRef, confidence }`
- `CausalArc{ arcId, hypothesis, startTime, endTime, confidence }`

**Constraints / indexes**

- `CREATE CONSTRAINT narrative_id IF NOT EXISTS FOR (n:Narrative) REQUIRE n.narrativeId IS UNIQUE;`
- `CREATE CONSTRAINT subnarrative_id IF NOT EXISTS FOR (n:SubNarrative) REQUIRE n.subNarrativeId IS UNIQUE;`
- `CREATE CONSTRAINT storyelement_id IF NOT EXISTS FOR (n:StoryElement) REQUIRE n.elementId IS UNIQUE;`

### Proposed GraphQL Operations

**Types**

- `Narrative`, `SubNarrative`, `StoryElement`, `CausalArc`, `NarrativeRole`, `NarrativeClaim`

**Queries**

- `narrative(id: ID!): Narrative`
- `narrativeGraph(id: ID!, depth: Int = 3): NarrativeGraph`
- `storyElements(filter: StoryElementFilter): [StoryElement!]!`

**Mutations**

- `upsertNarrative(input: NarrativeInput!): Narrative`
- `linkStoryElement(input: StoryElementLinkInput!): StoryElement`
- `attachNarrativeEvidence(input: NarrativeEvidenceInput!): NarrativeClaim`

### Copilot Chain: Narrative Structure Builder

1. **Ingest & normalize** content to `Content` and `Entity` nodes.
2. **Detect narrative candidates** using narrative mining heuristics and map to `Narrative` nodes.
3. **Decompose into story elements** (`StoryElement`, `CausalArc`, `NarrativeRole`).
4. **Validate evidence links** to `Content` with provenance and confidence scoring.
5. **Publish** the narrative graph and emit provenance events.

**Guardrails**

- Policy-as-code gate ensures only approved narrative taxonomy and roles are used.
- Provenance ledger logs all narrative assertions and edits.

**Governed Exceptions**

- Intentionally constrained pending doctrine codification in policy-as-code.

## Epic F2: Doctrine-Aware Playbooks

### Objective

Encode information operations doctrine into playbooks that the simulator can parameterize for
specific scenarios while keeping compliance decisions explicit and auditable.

### Scope

- Playbook library with doctrine alignment and pre-authorized messaging constraints.
- Parameter schema for channels, audiences, and effect modes.
- Integration with policy-as-code for compliance gating.

### Proposed Neo4j Schema

**Node labels**

- `Doctrine`
- `Playbook`
- `PlaybookStep`
- `EffectMode` (e.g., deter, dissuade, inoculate)
- `MessageConstraint`

**Relationships**

- `(Doctrine)-[:AUTHORIZES]->(Playbook)`
- `(Playbook)-[:HAS_STEP]->(PlaybookStep)`
- `(PlaybookStep)-[:USES_EFFECT]->(EffectMode)`
- `(PlaybookStep)-[:BOUNDED_BY]->(MessageConstraint)`
- `(Playbook)-[:TARGETS]->(AudienceSegment)`

**Key properties**

- `Doctrine{ doctrineId, name, version, authorityRef }`
- `Playbook{ playbookId, name, status, doctrineRef, approvalRef }`
- `PlaybookStep{ stepId, sequence, objective, guardrailsRef }`

**Constraints / indexes**

- `CREATE CONSTRAINT doctrine_id IF NOT EXISTS FOR (n:Doctrine) REQUIRE n.doctrineId IS UNIQUE;`
- `CREATE CONSTRAINT playbook_id IF NOT EXISTS FOR (n:Playbook) REQUIRE n.playbookId IS UNIQUE;`

### Proposed GraphQL Operations

**Queries**

- `playbook(id: ID!): Playbook`
- `playbooks(filter: PlaybookFilter): [Playbook!]!`
- `doctrine(id: ID!): Doctrine`

**Mutations**

- `registerDoctrine(input: DoctrineInput!): Doctrine`
- `createPlaybook(input: PlaybookInput!): Playbook`
- `authorizePlaybook(input: PlaybookAuthorizationInput!): Playbook`

### Copilot Chain: Doctrine Playbook Composer

1. **Select doctrine** and validate authority references.
2. **Assemble playbook steps** with parameter schema and effect modes.
3. **Run policy gate** to ensure message constraints and approvals match doctrine.
4. **Emit compliance decision log** and provenance events.
5. **Publish** playbook to the simulation library.

**Guardrails**

- Compliance decisions are logged; policy engine provides allow/deny with reason codes.
- Message constraints must reference doctrine authority files.

**Governed Exceptions**

- Intentionally constrained pending formalization of cross-cell coordination semantics.

## Epic F3: Counter-Campaign Templates & Simulation Workbench

### Objective

Provide reusable counter-campaign templates and a simulation workbench that measures narrative
impact, enabling rapid scenario-specific adaptation and effect validation.

### Scope

- Counter-campaign templates linked to playbooks and narrative graphs.
- Scenario parameterization for audiences, channels, and timing.
- Simulation loop with effect metrics and outcome scoring.

### Proposed Neo4j Schema

**Node labels**

- `CounterCampaignTemplate`
- `SimulationScenario`
- `SimulationRun`
- `EffectMetric`
- `Channel`

**Relationships**

- `(CounterCampaignTemplate)-[:BASED_ON]->(Playbook)`
- `(CounterCampaignTemplate)-[:COUNTERS]->(Narrative)`
- `(SimulationScenario)-[:USES_TEMPLATE]->(CounterCampaignTemplate)`
- `(SimulationRun)-[:EVALUATES]->(EffectMetric)`
- `(SimulationRun)-[:IN_SCENARIO]->(SimulationScenario)`

**Key properties**

- `CounterCampaignTemplate{ templateId, name, objective, defaultParameters }`
- `SimulationScenario{ scenarioId, name, assumptions, constraints }`
- `SimulationRun{ runId, startTime, endTime, status, score }`

**Constraints / indexes**

- `CREATE CONSTRAINT template_id IF NOT EXISTS FOR (n:CounterCampaignTemplate) REQUIRE n.templateId IS UNIQUE;`
- `CREATE CONSTRAINT scenario_id IF NOT EXISTS FOR (n:SimulationScenario) REQUIRE n.scenarioId IS UNIQUE;`

### Proposed GraphQL Operations

**Queries**

- `counterCampaignTemplate(id: ID!): CounterCampaignTemplate`
- `simulationScenario(id: ID!): SimulationScenario`
- `simulationRuns(filter: SimulationRunFilter): [SimulationRun!]!`

**Mutations**

- `createCounterCampaignTemplate(input: CounterCampaignTemplateInput!): CounterCampaignTemplate`
- `runSimulation(input: SimulationRunInput!): SimulationRun`
- `recordSimulationMetric(input: SimulationMetricInput!): EffectMetric`

### Copilot Chain: Counter-Campaign Simulator

1. **Select narrative to counter** and bind to a template.
2. **Parameterize scenario** with audience segments, channels, and timing.
3. **Execute simulation** and compute effect metrics.
4. **Compare outcomes** to baseline narrative graph signals.
5. **Publish recommendations** and update evidence ledger.

**Guardrails**

- Simulation runs require policy approval for external messaging parameters.
- All run artifacts are written to provenance with immutable hashes.

**Governed Exceptions**

- Intentionally constrained pending effect-metric calibration standards.

## Success Metrics

- Narrative graphs linked to evidence for 95% of story elements.
- Playbooks have policy decision logs attached for 100% of authored steps.
- Simulation runs produce effect metrics with provenance references for every run.

## Verification Plan

- Add unit tests for schema registration and GraphQL resolvers when implemented.
- Add integration tests for playbook policy gates and simulation run logging.
- Record evidence artifacts for narrative graph construction and simulation outputs.

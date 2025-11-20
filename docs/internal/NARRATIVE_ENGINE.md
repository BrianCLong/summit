# Narrative Simulation Engine

**Module:** `server/src/narrative`
**Owner:** Backend Team
**Status:** Experimental

## Overview

The Narrative Simulation Engine is a discrete-time simulation system designed to model the evolution of "narratives" within a network of entities. It acts as a "physics engine" for information spread, sentiment analysis, and influence propagation.

Unlike a standard graph traversal, this engine maintains state over time (`ticks`), allowing for the emergence of complex behaviors like momentum, decay, and resistance.

## Core Concepts

### 1. Entities
Entities are the actors in the simulation (e.g., People, Organizations, Topics).
Each entity has dynamic properties:
- **Sentiment (-1 to 1):** How positive/negative they feel.
- **Influence (0 to 1.5):** How much they impact others.
- **Pressure (0 to 1):** "Heat" or stress level.
- **Resilience:** Resistance to change.

### 2. Ticks
The simulation proceeds in discrete steps called `ticks`. A tick can represent any unit of time (minutes, hours, days) as defined in the config.
In each tick:
1. Events are dequeued and applied.
2. Entity states are updated.
3. States decay naturally (entropy).
4. "Arcs" are re-computed.

### 3. Events
Events are the inputs to the system. They can be:
- **Injected:** Manually triggered by users or external systems ("God mode").
- **Generated:** Created by the simulation itself (e.g., an entity reacting).

When an Event hits an Actor:
- It modifies the Actor's state.
- It propagates to the Actor's neighbors (dampened by relationship strength).

### 4. Story Arcs
A `StoryArc` is a high-level abstraction computed from the low-level entity states. It answers: *"What is happening with Theme X?"*
- **Momentum:** Is the theme growing or shrinking?
- **Key Drivers:** Who is leading this narrative?
- **Outlook:** Is it getting better or worse?

## Extension Points

### Custom Generators
The engine uses a `NarrativeGenerator` strategy pattern.
- `RuleBasedNarrativeGenerator`: Deterministic, template-based summaries.
- `LLMDrivenNarrativeGenerator`: Uses an LLM to write rich, context-aware narratives.

To add a new generator, implement the `NarrativeGenerator` interface and register it in `engine.ts`.

### Simulation Hooks
Currently, the simulation is self-contained. Future work could allow hooks for:
- **External Triggers:** Firing webhooks when `Pressure` exceeds a threshold.
- **Live Adjustments:** Modifying graph topology dynamically based on sentiment shifts.

## Usage Example

```typescript
const engine = new NarrativeSimulationEngine({
  id: 'sim-1',
  name: 'Market Crash Scenario',
  tickIntervalMinutes: 60,
  themes: ['Panic', 'Greed'],
  initialEntities: [...],
});

// Run 10 steps
const state = await engine.tick(10);

// Inject an event
engine.injectActorAction('actor-123', 'Released a controversial statement', {
  sentimentShift: -0.5
});
```

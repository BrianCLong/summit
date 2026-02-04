# Difficulty-Aware Agent Orchestration (DAAO) Standards

## Overview
DAAO provides a mechanism to adapt agent workflow complexity and model selection based on task difficulty.

## Components
1. **Difficulty Estimator**: Heuristic-based scorer (0-1) that maps to bands (easy, medium, hard).
2. **Cost-Aware Router**: Selects models from a catalog based on budget and capability requirements.
3. **Collaboration Loop**: Optional "Critic -> Refiner" loop for high-difficulty tasks.

## Interface Standards
### Difficulty Signal
```typescript
interface DifficultySignal {
  score: number;
  band: "easy" | "medium" | "hard";
  reasons: string[];
}
```

### Routing Decision
```typescript
interface RoutingDecision {
  modelId: string;
  provider: string;
  estimatedWorstCaseCost: number;
  reasons: string[];
}
```

## Usage
- Always provide a `budget` (USD) when requesting routing.
- Check `DifficultySignal.band` to determine if debate validation is needed.

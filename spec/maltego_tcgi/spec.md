# Maltego — TCGI: Transform Graph Grammar Induction for Auto-Macros

## Overview
TCGI learns graph grammars from analyst transform sessions to generate policy- and license-compliant auto-macros optimized for batching, caching, and cost.

## Architecture
- **Trace Collector**: captures investigation session transform graphs.
- **Grammar Inducer**: mines frequent subgraphs and builds weighted production rules.
- **Objective Interpreter**: parses macro requests for coverage/precision/latency/cost objectives.
- **Macro Synthesizer**: generates candidate macro transform graphs satisfying policy effect and license constraints.
- **Optimizer**: batches by endpoint, deduplicates and caches transformations, estimates cost, ranks counterfactual macros.
- **Macro Artifact Emitter**: outputs macro graph, justification mapping to productions, witness chain, cost estimate, replay token; registers with transparency log.

## Data Contracts
- **Session trace**: transform operations, entities, edges, timestamps, policy context.
- **Macro artifact**: macro graph, justification, policy/license compliance flags, expected cost, witness chain, replay token, attestation quote?.

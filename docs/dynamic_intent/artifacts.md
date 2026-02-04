# Dynamic Intent Artifacts

This document defines the first-class artifacts for dynamic intent workflows.

## Artifact Inventory

- `SketchStoryboard`: storyboard frames and stroke data.
- `IntentAmbiguity`: ambiguity classification with severity and scope.
- `ClarificationTurn`: UI prompt and user response for disambiguation.
- `IntentMemory`: stored answers to prevent repeat questions.
- `RefinementOp`: keyframe-anchored overlays and scoped edits.

## Storage Constraints

- `storyboard` content is user-supplied and potentially sensitive.
- `intent_memory` is derived and higher-sensitivity.
- Raw images, raw strokes, and uploads are never logged; store hashed references only.

## Determinism Contract

Artifacts must be reproducible from the same inputs, and local edits must not alter unaffected
segments. Any exception must be tagged as a governed exception and documented in evidence.

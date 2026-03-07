# @intelgraph/summit-schemas

Schema package for Summit Cognitive Battlespace contracts.

## Contents

- Tri-Graph object schemas: Artifact, Narrative, Belief, RealityClaim
- Cross-graph links: NarrativeClaimLink, BeliefClaimLink, NarrativeBeliefLink
- Derived metrics: DivergenceMetric, BeliefGapMetric
- NG/BG WriteSet envelope and unified rejection report schemas

## Validator API

Import AJV validators from:

```ts
import { validators } from '@intelgraph/summit-schemas/cogbattlespace';
```

## Contract invariant

`cog_writeset` allows writes only to NG/BG domains and explicitly denies RG.

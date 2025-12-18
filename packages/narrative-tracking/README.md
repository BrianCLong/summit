# @intelgraph/narrative-tracking

Narrative extraction and tracking for influence operations detection.

## Features

- Story arc identification
- Narrative framing analysis
- Counter-narrative detection
- Narrative evolution tracking
- Theme extraction
- Actor identification

## Installation

```bash
pnpm add @intelgraph/narrative-tracking
```

## Quick Start

```typescript
import { NarrativeExtractor, FramingAnalyzer } from '@intelgraph/narrative-tracking';

const extractor = new NarrativeExtractor();
const narrative = await extractor.extractNarrative("Your text...", "source-id");

console.log(narrative.themes);
console.log(narrative.storyArc);
```

## Documentation

See [docs/analytics/SENTIMENT_ANALYSIS.md](../../docs/analytics/SENTIMENT_ANALYSIS.md) for full documentation.

## License

MIT

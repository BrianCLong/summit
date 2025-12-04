# @intelgraph/influence-detection

Bot detection, coordinated inauthentic behavior, and astroturfing detection.

## Features

- Bot detection algorithms
- Coordinated inauthentic behavior (CIB) detection
- Astroturfing detection
- Amplification network identification
- Network analysis

## Installation

```bash
pnpm add @intelgraph/influence-detection
```

## Quick Start

```typescript
import { BotDetector } from '@intelgraph/influence-detection';

const detector = new BotDetector();
const result = await detector.detectBot(accountActivity);

console.log(result.botScore);
console.log(result.classification);
```

## Documentation

See [docs/analytics/SENTIMENT_ANALYSIS.md](../../docs/analytics/SENTIMENT_ANALYSIS.md) for full documentation.

## License

MIT

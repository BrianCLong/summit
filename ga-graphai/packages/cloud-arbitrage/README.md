# @ga-graphai/cloud-arbitrage

Smart agent toolkit for multi-cloud compute/storage/network arbitrage. Provides:

- Data feed abstraction for ingesting live financial, energy, demand, and regulatory signals.
- Strategy suite (serverless, burst, reserved, spot, federated) for ranking provider-region placements.
- Arbitrage agent that synthesizes strategy outputs into deployable portfolios.
- Head-to-head evaluator for benchmarking against AWS Compute Optimizer, Spot.io, and Google Recommender baselines.
- Sample A/B experiment logs under `experiments/` to ground economic validation.

## Quick Start
```bash
pnpm install # or npm install
cd ga-graphai/packages/cloud-arbitrage
pnpm test
```

## Usage Example
```ts
import { ArbitrageAgent, CompositeDataFeed, InMemoryDataFeed } from '@ga-graphai/cloud-arbitrage';

const feed = new CompositeDataFeed([
  new InMemoryDataFeed(financialData, energyData, demandData, regulatoryData)
]);
const snapshot = await feed.fetchSnapshot();
const agent = new ArbitrageAgent();
const portfolio = agent.recommendPortfolio(snapshot, workloadProfile, { topN: 5 });
```

## Testing
- `pnpm test` runs the Vitest suite covering data aggregation, strategy scoring, and evaluator uplift calculations.

## Data Ethics & Compliance
- No secrets stored in repo; configure API keys via environment variables in production deployments.
- Regulatory scoring layer is extensible for new jurisdictions and compliance mandates.

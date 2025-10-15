# @ga-graphai/cloud-arbitrage

Smart agent toolkit for multi-cloud compute/storage/network arbitrage that now fuses trading intelligence across consumer and collectibles markets. Provides:

- Data feed abstraction for ingesting live financial, energy, demand, regulatory, consumer, collectible, prediction-market, and hedge-instrument signals.
- Strategy suite (serverless, burst, reserved, spot, federated) for ranking provider-region placements with cross-market arbitrage, sentiment, and hedge boosts baked into scores.
- Arbitrage agent that synthesizes strategy outputs into deployable portfolios and surfaces cross-market actions plus hedge effectiveness.
- Universal opportunity discovery that aggregates consumer, collectible, prediction, and hedge actions for Switchboard/CompanyOS workflows.
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
import {
  ArbitrageAgent,
  CompositeDataFeed,
  InMemoryDataFeed
} from '@ga-graphai/cloud-arbitrage';

const feed = new CompositeDataFeed([
  new InMemoryDataFeed(
    financialData,
    energyData,
    demandData,
    regulatoryData,
    consumerSignals,
    collectibleSignals,
    predictionSignals,
    hedgeInstruments
  )
]);
const snapshot = await feed.fetchSnapshot();
const agent = new ArbitrageAgent();
const portfolio = agent.recommendPortfolio(snapshot, workloadProfile, { topN: 5 });
const crossMarket = agent.discoverCrossMarketOpportunities(snapshot, workloadProfile);
```

`portfolio` entries now include hedge effectiveness scores and cross-market action counts, while `crossMarket` delivers consumer, collectible, prediction, and hedge plays that can be routed into CompanyOS Switchboard flows for paper or live execution.

## Testing
- `pnpm test` runs the Vitest suite covering data aggregation, cross-market signal scoring, and evaluator uplift calculations.

## Data Ethics & Compliance
- No secrets stored in repo; configure API keys via environment variables in production deployments.
- Regulatory scoring layer is extensible for new jurisdictions and compliance mandates.

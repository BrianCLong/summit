# @ga-graphai/cloud-arbitrage

Smart agent toolkit for multi-cloud compute/storage/network arbitrage with cross-market extensions. Provides:

- Data feed abstraction for ingesting live financial, energy, demand, consumer demand, and collectibles sentiment signals.
- Strategy suite (serverless, burst, reserved, spot, federated) for ranking provider-region placements.
- Arbitrage agent that synthesizes strategy outputs into deployable portfolios enriched with consumer/collectible hedge scores.
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
  new InMemoryDataFeed(
    financialData,
    consumerMarketplaceSignals,
    collectibleSignals,
    energyData,
    demandData,
    regulatoryData
  )
]);
const snapshot = await feed.fetchSnapshot();
const agent = new ArbitrageAgent();
const portfolio = agent.recommendPortfolio(snapshot, workloadProfile, { topN: 5 });

for (const entry of portfolio) {
  console.log(
    `${entry.strategy}@${entry.provider}:${entry.region}`,
    'hedge=', entry.hedgeScore.toFixed(2),
    'arbitrage=', entry.arbitrageOpportunityScore.toFixed(2)
  );
}
```

### Data Requirements

- **Financial**: Cloud provider price books (spot/reserved) with currency metadata.
- **Demand Forecasts**: Utilization predictions per provider-region-resource triple.
- **Energy & Regulation**: Regional carbon intensity and incentive/penalty structures.
- **Consumer Marketplaces**: Marketplace price/volume trends, demand and sentiment scores for workload-adjacent categories.
- **Collectibles & Auctions**: Scarcity indices, auction clear rates, floor prices, and sentiment from specialist venues (regional or global).

The `CompositeDataFeed` merges heterogeneous feeds and normalizes timestamps so strategies can reason about blended arbitrage and hedge opportunities across financial, prediction, consumer, and collectibles venues.

### Snapshot Normalization

- Incoming feeds are de-duplicated by provider/region (financial, demand, regulation), region (energy), and marketplace or collection keys (consumer, collectibles).
- Pricing and utilization signals are blended using weighted averages (volume-weighted for consumer marketplaces, scarcity-weighted for collectibles) to smooth noisy venue updates.
- Regulatory entries resolve to the most recent effective date so downstream strategies respect the latest incentives or penalties.

## Testing
- `pnpm test` runs the Vitest suite covering data aggregation, strategy scoring, and evaluator uplift calculations.

## Data Ethics & Compliance
- No secrets stored in repo; configure API keys via environment variables in production deployments.
- Regulatory scoring layer is extensible for new jurisdictions and compliance mandates.

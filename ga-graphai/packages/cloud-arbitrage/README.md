# @ga-graphai/cloud-arbitrage

Smart agent toolkit for multi-cloud compute/storage/network arbitrage. Provides:

- Data feed abstraction for ingesting live financial, energy, demand, regulatory, consumer commerce, collectibles/auction, prediction, crypto, forex, derivatives, commodities, sports gaming, exotic niche, and meta front-run signal cascades.
- Strategy suite (serverless, burst, reserved, spot, federated) for ranking provider-region placements.
- Arbitrage agent that synthesizes strategy outputs into deployable portfolios.
- Head-to-head evaluator for benchmarking against AWS Compute Optimizer, Spot.io, and Google Recommender baselines.
- Sample A/B experiment logs under `experiments/` to ground economic validation.
- Ready-to-orchestrate hooks for CompanyOS Switchboard, IntelGraph, Summit, and other enterprise automation planes so trading intelligence can steer ops workflows.

New in this release:

- Universal trading signal mesh: prediction markets, crypto, forex, derivatives, commodities, sports gaming, and exotic niche datasets now sit alongside financial, energy, demand, regulatory, consumer, and collectibles layers.
- Meta-signal graph captures second- and third-order cascades (front-running the front-runners) so arbitrage, hedge, and speculative plays can be stress-tested before execution.
- Strategies and the arbitrage agent quantify opportunity, hedge, and cascade strength across all venues—unlocking cross-market trades, paper-mode governance, and live routing through CompanyOS/Switchboard.

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
    financialQuotes,
    energyCurves,
    consumerMarketplaceSignals,
    collectibleAuctionSignals,
    predictionMarkets,
    cryptoSignals,
    forexSignals,
    derivativesFlows,
    commodityCurves,
    sportsEdges,
    exoticOpportunities,
    metaSignalInsights,
    demandForecasts,
    regulatoryPrograms
  )
]);
const snapshot = await feed.fetchSnapshot();
const agent = new ArbitrageAgent();
const portfolio = agent.recommendPortfolio(snapshot, workloadProfile, { topN: 5 });

console.log(portfolio[0].crossMarketScore); // > 0 highlights cross-venue opportunity strength
console.log(portfolio[0].arbitrageStrength); // signals spread-driven arbitrage viability
console.log(portfolio[0].metaSignalScore); // > 0.4 indicates strong front-run cascading edge
console.log(portfolio[0].hedgeStrength); // signals hedge pairing potential
```

## Data Requirements

The agent expects normalized datasets for each signal layer. Minimum fields:

- **Financial** – provider/region, spot & reserved prices, currency, timestamp.
- **Energy** – region, carbon intensity (g/kWh), price/kWh, timestamp.
- **Demand Forecasts** – provider/region/resource, predicted utilization, confidence, timestamp.
- **Regulation** – provider/region, incentive & penalty per unit, descriptive notes, effective date.
- **Consumer Marketplaces** – marketplace, region, category, SKU identifier, 24h average price, 24h price change %, 24h volume, sentiment score (-1 to 1), timestamp.
- **Collectibles/Auctions** – venue, region, collection, asset id, scarcity index (0..1), clearing price, 24h price change %, bid coverage ratio, auction sentiment (-1 to 1), timestamp.
- **Prediction Markets** – market, region, event id, contract id, implied probability (0..1), liquidity score (0..1+), 24h volume, 24h price change %, timestamp.
- **Crypto** – exchange, region, pair, last price, 1h price change %, funding rate, open interest change %, 24h volume, timestamp.
- **Forex** – venue, region, pair, spot rate, 1h rate change %, spread (pips), volatility score (0..1), timestamp.
- **Derivatives/Options/Structured** – venue, region, instrument, option type, notional USD, skew score, IV percentile, flow balance (-1..1), timestamp.
- **Commodities** – venue, region, commodity, spot price, storage cost %, backwardation %, supply stress score (0..1), timestamp.
- **Sports & Event Gaming** – sportsbook, region, event id, market type, implied edge %, liquidity score (0..1), 1h price change %, timestamp.
- **Exotic/Alternative** – venue, region, asset type, opportunity label, expected value %, scarcity score (0..1), regulatory risk score (0..1), timestamp.
- **Meta-Signals** – region, leading indicator, target signal, lead time (s), confidence (0..1), expected impact score (0..1), cascade depth, timestamp.

All signal arrays are optional per feed source, but higher fidelity inputs improve cross-market scoring. When a source cannot provide a dataset, pass an empty array so the composite feed can merge without errors.

## Cross-Market Workflow Examples

- **Marketplace-Aligned Placement** – blend consumer sales momentum with compute demand forecasts to bias workloads toward regions where downstream consumption is surging.
- **Collectible Hedge Detection** – surface strategies where scarcity indices and positive auction sentiment create a natural hedge against softening consumer sentiment.
- **Global Arbitrage Fabric** – compare spreads across prediction, forex, crypto, and commodities to orchestrate multi-hop trades that subsidize cloud footprint while front-running competitive bots.
- **Dynamic Hedge Constructor** – auto-synthesize convex hedges with derivatives, sports/event offsets, and exotic assets when meta-signal cascades forecast volatility spikes.
- **CompanyOS/Switchboard Automation** – stream the agent’s scores into Switchboard playbooks so IntelGraph and Summit agents can launch paper-trade reviews, compliance gating, or production execution.

## Testing
- `pnpm test` runs the Vitest suite covering data aggregation, strategy scoring, and evaluator uplift calculations.

## Data Ethics & Compliance
- No secrets stored in repo; configure API keys via environment variables in production deployments.
- Regulatory scoring layer is extensible for new jurisdictions and compliance mandates.

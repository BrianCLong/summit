"use strict";
/**
 * Risk Analytics Service
 *
 * Comprehensive portfolio and counterparty risk analytics including:
 * - Value at Risk (VaR) calculations
 * - Stress testing and scenario analysis
 * - Counterparty credit risk
 * - Liquidity risk assessment
 * - Concentration risk monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAnalyticsService = void 0;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    varConfidenceLevels: [0.95, 0.99],
    varHorizonDays: 1,
    historicalDays: 252,
    monteCarloSimulations: 10000,
    liquidityThresholdDays: 5,
    concentrationWarningThreshold: 0.1,
};
class RiskAnalyticsService {
    pg;
    config;
    constructor(pg, config) {
        this.pg = pg;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    // ============================================================================
    // PORTFOLIO RISK ANALYTICS
    // ============================================================================
    /**
     * Calculate comprehensive portfolio risk metrics
     */
    async calculatePortfolioRisk(tenantId, portfolioId) {
        // Get positions
        const positions = await this.getPositions(tenantId, portfolioId);
        if (positions.length === 0) {
            throw new Error('Portfolio has no positions');
        }
        const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
        // Calculate position-level risk
        const positionRisks = await Promise.all(positions.map((p) => this.calculatePositionRisk(tenantId, p, totalValue)));
        // Calculate portfolio VaR using historical simulation
        const { var95, var99, cvar95, cvar99 } = await this.calculatePortfolioVaR(tenantId, positions, totalValue);
        // Calculate portfolio metrics
        const { sharpeRatio, sortinoRatio, maxDrawdown, beta, alpha } = await this.calculatePortfolioMetrics(tenantId, portfolioId, positions);
        // Calculate concentration risk
        const concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);
        // Run stress tests
        const stressTestResults = await this.runStressTests(tenantId, positions, totalValue);
        const portfolioRisk = {
            portfolioId,
            tenantId,
            calculatedAt: new Date(),
            var95,
            var99,
            cvar95,
            cvar99,
            sharpeRatio,
            sortinoRatio,
            maxDrawdown,
            beta,
            alpha,
            currency: 'USD',
            positions: positionRisks,
            concentrationRisk,
            stressTestResults,
        };
        // Store results
        await this.storePortfolioRisk(portfolioRisk);
        return portfolioRisk;
    }
    /**
     * Calculate VaR using historical simulation
     */
    async calculatePortfolioVaR(tenantId, positions, totalValue) {
        // Get historical returns for all positions
        const positionReturns = new Map();
        for (const position of positions) {
            const history = await this.getPriceHistory(position.symbol, this.config.historicalDays);
            const returns = this.calculateReturns(history);
            positionReturns.set(position.symbol, returns);
        }
        // Calculate portfolio returns
        const portfolioReturns = [];
        const numDays = Math.min(...Array.from(positionReturns.values()).map((r) => r.length));
        for (let i = 0; i < numDays; i++) {
            let portfolioReturn = 0;
            for (const position of positions) {
                const weight = position.marketValue / totalValue;
                const returns = positionReturns.get(position.symbol) || [];
                portfolioReturn += weight * (returns[i] || 0);
            }
            portfolioReturns.push(portfolioReturn);
        }
        // Sort returns for percentile calculation
        const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
        // Calculate VaR at different confidence levels
        const var95Index = Math.floor(sortedReturns.length * 0.05);
        const var99Index = Math.floor(sortedReturns.length * 0.01);
        const var95Pct = sortedReturns[var95Index] || 0;
        const var99Pct = sortedReturns[var99Index] || 0;
        // Calculate CVaR (Expected Shortfall)
        const cvar95Pct = sortedReturns.slice(0, var95Index + 1).reduce((sum, r) => sum + r, 0) /
            (var95Index + 1);
        const cvar99Pct = sortedReturns.slice(0, var99Index + 1).reduce((sum, r) => sum + r, 0) /
            (var99Index + 1);
        return {
            var95: Math.abs(var95Pct * totalValue),
            var99: Math.abs(var99Pct * totalValue),
            cvar95: Math.abs(cvar95Pct * totalValue),
            cvar99: Math.abs(cvar99Pct * totalValue),
        };
    }
    /**
     * Calculate individual position risk
     */
    async calculatePositionRisk(tenantId, position, totalPortfolioValue) {
        const history = await this.getPriceHistory(position.symbol, this.config.historicalDays);
        const returns = this.calculateReturns(history);
        // Calculate position VaR
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const var95Index = Math.floor(sortedReturns.length * 0.05);
        const var99Index = Math.floor(sortedReturns.length * 0.01);
        const var95Pct = sortedReturns[var95Index] || 0;
        const var99Pct = sortedReturns[var99Index] || 0;
        // Calculate beta against benchmark (S&P 500)
        const benchmarkHistory = await this.getPriceHistory('SPY', this.config.historicalDays);
        const benchmarkReturns = this.calculateReturns(benchmarkHistory);
        const beta = this.calculateBeta(returns, benchmarkReturns);
        return {
            positionId: (0, crypto_1.randomUUID)(),
            symbol: position.symbol,
            quantity: position.quantity,
            marketValue: position.marketValue,
            weight: position.marketValue / totalPortfolioValue,
            var95: Math.abs(var95Pct * position.marketValue),
            var99: Math.abs(var99Pct * position.marketValue),
            beta,
        };
    }
    /**
     * Calculate portfolio performance metrics
     */
    async calculatePortfolioMetrics(tenantId, portfolioId, positions) {
        // Get portfolio returns
        const portfolioHistory = await this.getPortfolioValueHistory(tenantId, portfolioId);
        const returns = this.calculateReturns(portfolioHistory);
        if (returns.length === 0) {
            return {
                sharpeRatio: 0,
                sortinoRatio: 0,
                maxDrawdown: 0,
                beta: 1,
                alpha: 0,
            };
        }
        // Risk-free rate (annualized, assuming 5%)
        const riskFreeRate = 0.05 / 252;
        // Calculate mean return and standard deviation
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        // Sharpe Ratio
        const sharpeRatio = stdDev > 0 ? ((meanReturn - riskFreeRate) / stdDev) * Math.sqrt(252) : 0;
        // Sortino Ratio (downside deviation)
        const downsideReturns = returns.filter((r) => r < riskFreeRate);
        const downsideVariance = downsideReturns.length > 0
            ? downsideReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeRate, 2), 0) /
                downsideReturns.length
            : 0;
        const downsideDev = Math.sqrt(downsideVariance);
        const sortinoRatio = downsideDev > 0 ? ((meanReturn - riskFreeRate) / downsideDev) * Math.sqrt(252) : 0;
        // Maximum Drawdown
        const maxDrawdown = this.calculateMaxDrawdown(portfolioHistory);
        // Beta and Alpha against benchmark
        const benchmarkHistory = await this.getPriceHistory('SPY', this.config.historicalDays);
        const benchmarkReturns = this.calculateReturns(benchmarkHistory);
        const beta = this.calculateBeta(returns, benchmarkReturns);
        const benchmarkMeanReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
        const alpha = (meanReturn - riskFreeRate - beta * (benchmarkMeanReturn - riskFreeRate)) * 252;
        return { sharpeRatio, sortinoRatio, maxDrawdown, beta, alpha };
    }
    /**
     * Calculate concentration risk metrics
     */
    calculateConcentrationRisk(positions, totalValue) {
        // Top holdings
        const sortedPositions = [...positions].sort((a, b) => b.marketValue - a.marketValue);
        const topHoldings = sortedPositions.slice(0, 10).map((p) => ({
            symbol: p.symbol,
            weight: p.marketValue / totalValue,
        }));
        // Sector concentration
        const sectorMap = new Map();
        for (const p of positions) {
            const sector = p.sector || 'Unknown';
            sectorMap.set(sector, (sectorMap.get(sector) || 0) + p.marketValue);
        }
        const sectorConcentration = Array.from(sectorMap.entries())
            .map(([sector, value]) => ({ sector, weight: value / totalValue }))
            .sort((a, b) => b.weight - a.weight);
        // Geographic concentration
        const geoMap = new Map();
        for (const p of positions) {
            const region = p.country || 'Unknown';
            geoMap.set(region, (geoMap.get(region) || 0) + p.marketValue);
        }
        const geographicConcentration = Array.from(geoMap.entries())
            .map(([region, value]) => ({ region, weight: value / totalValue }))
            .sort((a, b) => b.weight - a.weight);
        // Asset class concentration
        const assetClassMap = new Map();
        for (const p of positions) {
            assetClassMap.set(p.assetClass, (assetClassMap.get(p.assetClass) || 0) + p.marketValue);
        }
        const assetClassConcentration = Array.from(assetClassMap.entries())
            .map(([assetClass, value]) => ({ assetClass, weight: value / totalValue }))
            .sort((a, b) => b.weight - a.weight);
        // Herfindahl Index (sum of squared weights)
        const weights = positions.map((p) => p.marketValue / totalValue);
        const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
        return {
            topHoldings,
            sectorConcentration,
            geographicConcentration,
            assetClassConcentration,
            herfindahlIndex,
            largestPositionWeight: topHoldings[0]?.weight || 0,
        };
    }
    // ============================================================================
    // STRESS TESTING
    // ============================================================================
    /**
     * Run stress tests on portfolio
     */
    async runStressTests(tenantId, positions, totalValue) {
        const scenarios = this.getStressScenarios();
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.runStressScenario(positions, totalValue, scenario);
            results.push(result);
        }
        return results;
    }
    /**
     * Define stress test scenarios
     */
    getStressScenarios() {
        return [
            {
                id: 'market_crash_2008',
                name: '2008 Financial Crisis',
                type: 'historical',
                description: 'Simulate 2008 financial crisis market conditions',
                shocks: {
                    equity: -0.50,
                    fixed_income: 0.05,
                    commodity: -0.30,
                    fx: -0.15,
                    derivative: -0.45,
                    crypto: -0.70,
                },
            },
            {
                id: 'covid_crash_2020',
                name: 'COVID-19 Market Crash',
                type: 'historical',
                description: 'Simulate March 2020 COVID-19 market crash',
                shocks: {
                    equity: -0.35,
                    fixed_income: 0.03,
                    commodity: -0.25,
                    fx: -0.10,
                    derivative: -0.40,
                    crypto: -0.50,
                },
            },
            {
                id: 'interest_rate_shock',
                name: 'Interest Rate Shock (+300bps)',
                type: 'hypothetical',
                description: 'Simulate sudden 300 basis point increase in interest rates',
                shocks: {
                    equity: -0.15,
                    fixed_income: -0.20,
                    commodity: -0.05,
                    fx: 0.05,
                    derivative: -0.25,
                    crypto: -0.20,
                },
            },
            {
                id: 'geopolitical_crisis',
                name: 'Geopolitical Crisis',
                type: 'hypothetical',
                description: 'Simulate major geopolitical event',
                shocks: {
                    equity: -0.20,
                    fixed_income: 0.02,
                    commodity: 0.25,
                    fx: -0.10,
                    derivative: -0.30,
                    crypto: -0.40,
                },
            },
            {
                id: 'liquidity_crisis',
                name: 'Liquidity Crisis',
                type: 'hypothetical',
                description: 'Simulate severe liquidity contraction',
                shocks: {
                    equity: -0.25,
                    fixed_income: -0.10,
                    commodity: -0.15,
                    fx: -0.05,
                    derivative: -0.35,
                    crypto: -0.60,
                },
            },
        ];
    }
    /**
     * Run a single stress scenario
     */
    async runStressScenario(positions, totalValue, scenario) {
        let totalImpact = 0;
        const positionImpacts = [];
        for (const position of positions) {
            const shock = scenario.shocks[position.assetClass] || -0.10;
            const impact = position.marketValue * shock;
            totalImpact += impact;
            positionImpacts.push({
                symbol: position.symbol,
                impact,
                impactPercent: shock * 100,
            });
        }
        return {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            scenarioType: scenario.type,
            description: scenario.description,
            portfolioImpact: totalImpact,
            portfolioImpactPercent: (totalImpact / totalValue) * 100,
            positionImpacts,
            assumptions: scenario.shocks,
        };
    }
    // ============================================================================
    // COUNTERPARTY RISK
    // ============================================================================
    /**
     * Calculate counterparty risk metrics
     */
    async calculateCounterpartyRisk(tenantId, counterpartyId) {
        // Get counterparty details
        const { rows: counterpartyRows } = await this.pg.query(`SELECT * FROM counterparties WHERE counterparty_id = $1 AND tenant_id = $2`, [counterpartyId, tenantId]);
        if (counterpartyRows.length === 0) {
            throw new Error('Counterparty not found');
        }
        const counterparty = counterpartyRows[0];
        // Calculate current exposure
        const { rows: exposureRows } = await this.pg.query(`SELECT COALESCE(SUM(exposure_amount), 0) as total_exposure
       FROM counterparty_exposures
       WHERE counterparty_id = $1 AND tenant_id = $2`, [counterpartyId, tenantId]);
        const currentExposure = parseFloat(exposureRows[0]?.total_exposure || '0');
        // Calculate risk metrics
        const probabilityOfDefault = this.calculatePD(counterparty.credit_rating);
        const lossGivenDefault = 0.45; // Standard LGD assumption
        const exposureAtDefault = currentExposure * 1.2; // Add potential future exposure
        const expectedLoss = probabilityOfDefault * lossGivenDefault * exposureAtDefault;
        const creditLimit = parseFloat(counterparty.credit_limit || '0');
        const utilizationPercent = creditLimit > 0 ? (currentExposure / creditLimit) * 100 : 0;
        // Calculate risk score (0-100)
        const riskScore = this.calculateCounterpartyRiskScore(probabilityOfDefault, utilizationPercent, counterparty.credit_rating);
        const riskLevel = this.getRiskLevel(riskScore);
        // Get active alerts
        const { rows: alertRows } = await this.pg.query(`SELECT alert_id FROM counterparty_alerts
       WHERE counterparty_id = $1 AND status = 'open'`, [counterpartyId]);
        const counterpartyRisk = {
            counterpartyId,
            tenantId,
            name: counterparty.name,
            legalEntityId: counterparty.legal_entity_id,
            creditRating: counterparty.credit_rating,
            creditRatingAgency: counterparty.rating_agency,
            probabilityOfDefault,
            exposureAtDefault,
            lossGivenDefault,
            expectedLoss,
            creditLimit,
            currentExposure,
            utilizationPercent,
            riskScore,
            riskLevel,
            lastReviewDate: counterparty.last_review_date,
            nextReviewDate: counterparty.next_review_date,
            alerts: alertRows.map((r) => r.alert_id),
        };
        // Store results
        await this.storeCounterpartyRisk(counterpartyRisk);
        return counterpartyRisk;
    }
    /**
     * Calculate probability of default from credit rating
     */
    calculatePD(creditRating) {
        const pdMap = {
            'AAA': 0.0001,
            'AA+': 0.0002,
            'AA': 0.0003,
            'AA-': 0.0004,
            'A+': 0.0006,
            'A': 0.0008,
            'A-': 0.0012,
            'BBB+': 0.0020,
            'BBB': 0.0035,
            'BBB-': 0.0055,
            'BB+': 0.0090,
            'BB': 0.0150,
            'BB-': 0.0250,
            'B+': 0.0400,
            'B': 0.0650,
            'B-': 0.1000,
            'CCC': 0.2000,
            'CC': 0.3500,
            'C': 0.5000,
            'D': 1.0000,
        };
        return pdMap[creditRating] || 0.05;
    }
    /**
     * Calculate counterparty risk score
     */
    calculateCounterpartyRiskScore(pd, utilization, rating) {
        // Score components
        const pdScore = Math.min(100, pd * 500); // 0-100 based on PD
        const utilizationScore = Math.min(100, utilization); // 0-100 based on utilization
        const ratingScore = this.getRatingScore(rating);
        // Weighted average
        return pdScore * 0.4 + utilizationScore * 0.3 + ratingScore * 0.3;
    }
    getRatingScore(rating) {
        const scores = {
            'AAA': 5, 'AA+': 10, 'AA': 12, 'AA-': 15,
            'A+': 20, 'A': 25, 'A-': 30,
            'BBB+': 40, 'BBB': 45, 'BBB-': 50,
            'BB+': 60, 'BB': 65, 'BB-': 70,
            'B+': 75, 'B': 80, 'B-': 85,
            'CCC': 90, 'CC': 95, 'C': 98, 'D': 100,
        };
        return scores[rating] || 50;
    }
    getRiskLevel(score) {
        if (score < 20)
            return 'minimal';
        if (score < 40)
            return 'low';
        if (score < 60)
            return 'moderate';
        if (score < 80)
            return 'high';
        return 'severe';
    }
    // ============================================================================
    // LIQUIDITY RISK
    // ============================================================================
    /**
     * Calculate liquidity risk for a portfolio
     */
    async calculateLiquidityRisk(tenantId, portfolioId) {
        const positions = await this.getPositions(tenantId, portfolioId);
        const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
        // Calculate position-level liquidity
        const positionLiquidity = [];
        let totalLiquidationCost = 0;
        let maxDaysToLiquidate = 0;
        for (const position of positions) {
            const liquidity = await this.calculatePositionLiquidity(position);
            positionLiquidity.push(liquidity);
            totalLiquidationCost += position.marketValue * (liquidity.marketImpact / 100);
            maxDaysToLiquidate = Math.max(maxDaysToLiquidate, liquidity.daysToLiquidate);
        }
        // Calculate portfolio liquidity score (weighted average)
        const liquidityScore = positionLiquidity.reduce((sum, pl, i) => sum + pl.liquidityScore * (positions[i].marketValue / totalValue), 0);
        // Get cash position
        const { rows: cashRows } = await this.pg.query(`SELECT COALESCE(SUM(amount), 0) as cash
       FROM portfolio_cash WHERE portfolio_id = $1 AND tenant_id = $2`, [portfolioId, tenantId]);
        const cashPosition = parseFloat(cashRows[0]?.cash || '0');
        // Get margin utilization
        const { rows: marginRows } = await this.pg.query(`SELECT margin_used, margin_available
       FROM portfolio_margin WHERE portfolio_id = $1 AND tenant_id = $2`, [portfolioId, tenantId]);
        const marginUsed = parseFloat(marginRows[0]?.margin_used || '0');
        const marginAvailable = parseFloat(marginRows[0]?.margin_available || '0');
        const marginUtilization = marginAvailable > 0 ? (marginUsed / marginAvailable) * 100 : 0;
        const liquidityRisk = {
            portfolioId,
            tenantId,
            calculatedAt: new Date(),
            liquidityScore,
            daysToLiquidate: maxDaysToLiquidate,
            liquidationCost: totalLiquidationCost,
            liquidationCostPercent: (totalLiquidationCost / totalValue) * 100,
            positionLiquidity,
            cashPosition,
            marginUtilization,
        };
        await this.storeLiquidityRisk(liquidityRisk);
        return liquidityRisk;
    }
    /**
     * Calculate liquidity metrics for a single position
     */
    async calculatePositionLiquidity(position) {
        // Get average daily volume
        const { rows } = await this.pg.query(`SELECT COALESCE(AVG(volume), 0) as avg_volume
       FROM market_data_daily
       WHERE symbol = $1 AND trade_date >= NOW() - INTERVAL '30 days'`, [position.symbol]);
        const avgVolume = parseFloat(rows[0]?.avg_volume || '0');
        // Days to liquidate assuming 20% participation rate
        const participationRate = 0.20;
        const daysToLiquidate = avgVolume > 0
            ? Math.ceil(position.quantity / (avgVolume * participationRate))
            : 999;
        // Market impact estimate (simplified model)
        // Impact increases with position size relative to ADV
        const volumeRatio = avgVolume > 0 ? position.quantity / avgVolume : 10;
        const marketImpact = Math.min(10, 0.1 + volumeRatio * 0.5); // Max 10% impact
        // Liquidity score (0-100, higher is more liquid)
        const liquidityScore = Math.max(0, 100 - daysToLiquidate * 10 - marketImpact * 5);
        return {
            symbol: position.symbol,
            quantity: position.quantity,
            averageDailyVolume: avgVolume,
            daysToLiquidate,
            marketImpact,
            liquidityScore,
        };
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    async getPositions(tenantId, portfolioId) {
        const { rows } = await this.pg.query(`SELECT
         p.symbol,
         p.quantity,
         p.market_value,
         p.cost_basis,
         s.asset_class,
         s.sector,
         s.country
       FROM portfolio_positions p
       LEFT JOIN security_master s ON p.symbol = s.symbol
       WHERE p.tenant_id = $1 AND p.portfolio_id = $2`, [tenantId, portfolioId]);
        return rows.map((r) => ({
            symbol: r.symbol,
            quantity: parseFloat(r.quantity),
            marketValue: parseFloat(r.market_value),
            costBasis: parseFloat(r.cost_basis),
            assetClass: r.asset_class || 'equity',
            sector: r.sector,
            country: r.country,
        }));
    }
    async getPriceHistory(symbol, days) {
        const { rows } = await this.pg.query(`SELECT trade_date as date, close as price
       FROM market_data_daily
       WHERE symbol = $1
       ORDER BY trade_date DESC
       LIMIT $2`, [symbol, days]);
        return rows.map((r) => ({
            date: r.date,
            price: parseFloat(r.price),
        })).reverse();
    }
    async getPortfolioValueHistory(tenantId, portfolioId) {
        const { rows } = await this.pg.query(`SELECT valuation_date as date, total_value as price
       FROM portfolio_valuations
       WHERE tenant_id = $1 AND portfolio_id = $2
       ORDER BY valuation_date DESC
       LIMIT $3`, [tenantId, portfolioId, this.config.historicalDays]);
        return rows.map((r) => ({
            date: r.date,
            price: parseFloat(r.price),
        })).reverse();
    }
    calculateReturns(history) {
        const returns = [];
        for (let i = 1; i < history.length; i++) {
            const prevPrice = history[i - 1].price;
            const currPrice = history[i].price;
            if (prevPrice > 0) {
                returns.push((currPrice - prevPrice) / prevPrice);
            }
        }
        return returns;
    }
    calculateBeta(returns, benchmarkReturns) {
        const n = Math.min(returns.length, benchmarkReturns.length);
        if (n < 2)
            return 1;
        const meanReturn = returns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        const meanBenchmark = benchmarkReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
        let covariance = 0;
        let benchmarkVariance = 0;
        for (let i = 0; i < n; i++) {
            covariance += (returns[i] - meanReturn) * (benchmarkReturns[i] - meanBenchmark);
            benchmarkVariance += Math.pow(benchmarkReturns[i] - meanBenchmark, 2);
        }
        return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
    }
    calculateMaxDrawdown(history) {
        if (history.length === 0)
            return 0;
        let peak = history[0].price;
        let maxDrawdown = 0;
        for (const point of history) {
            if (point.price > peak) {
                peak = point.price;
            }
            const drawdown = (peak - point.price) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        return maxDrawdown;
    }
    async storePortfolioRisk(risk) {
        await this.pg.query(`INSERT INTO portfolio_risk_metrics (
        portfolio_id, tenant_id, calculated_at, var_95, var_99, cvar_95, cvar_99,
        sharpe_ratio, sortino_ratio, max_drawdown, beta, alpha, currency,
        positions, concentration_risk, stress_test_results
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (portfolio_id, tenant_id) DO UPDATE SET
        calculated_at = EXCLUDED.calculated_at,
        var_95 = EXCLUDED.var_95,
        var_99 = EXCLUDED.var_99,
        cvar_95 = EXCLUDED.cvar_95,
        cvar_99 = EXCLUDED.cvar_99,
        sharpe_ratio = EXCLUDED.sharpe_ratio,
        sortino_ratio = EXCLUDED.sortino_ratio,
        max_drawdown = EXCLUDED.max_drawdown,
        beta = EXCLUDED.beta,
        alpha = EXCLUDED.alpha,
        positions = EXCLUDED.positions,
        concentration_risk = EXCLUDED.concentration_risk,
        stress_test_results = EXCLUDED.stress_test_results`, [
            risk.portfolioId,
            risk.tenantId,
            risk.calculatedAt,
            risk.var95,
            risk.var99,
            risk.cvar95,
            risk.cvar99,
            risk.sharpeRatio,
            risk.sortinoRatio,
            risk.maxDrawdown,
            risk.beta,
            risk.alpha,
            risk.currency,
            JSON.stringify(risk.positions),
            JSON.stringify(risk.concentrationRisk),
            JSON.stringify(risk.stressTestResults),
        ]);
    }
    async storeCounterpartyRisk(risk) {
        await this.pg.query(`INSERT INTO counterparty_risk_metrics (
        counterparty_id, tenant_id, calculated_at, probability_of_default,
        exposure_at_default, loss_given_default, expected_loss, credit_limit,
        current_exposure, utilization_percent, risk_score, risk_level
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (counterparty_id, tenant_id) DO UPDATE SET
        calculated_at = NOW(),
        probability_of_default = EXCLUDED.probability_of_default,
        exposure_at_default = EXCLUDED.exposure_at_default,
        loss_given_default = EXCLUDED.loss_given_default,
        expected_loss = EXCLUDED.expected_loss,
        current_exposure = EXCLUDED.current_exposure,
        utilization_percent = EXCLUDED.utilization_percent,
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level`, [
            risk.counterpartyId,
            risk.tenantId,
            risk.probabilityOfDefault,
            risk.exposureAtDefault,
            risk.lossGivenDefault,
            risk.expectedLoss,
            risk.creditLimit,
            risk.currentExposure,
            risk.utilizationPercent,
            risk.riskScore,
            risk.riskLevel,
        ]);
    }
    async storeLiquidityRisk(risk) {
        await this.pg.query(`INSERT INTO liquidity_risk_metrics (
        portfolio_id, tenant_id, calculated_at, liquidity_score, days_to_liquidate,
        liquidation_cost, liquidation_cost_percent, position_liquidity,
        cash_position, margin_utilization
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (portfolio_id, tenant_id) DO UPDATE SET
        calculated_at = EXCLUDED.calculated_at,
        liquidity_score = EXCLUDED.liquidity_score,
        days_to_liquidate = EXCLUDED.days_to_liquidate,
        liquidation_cost = EXCLUDED.liquidation_cost,
        liquidation_cost_percent = EXCLUDED.liquidation_cost_percent,
        position_liquidity = EXCLUDED.position_liquidity,
        cash_position = EXCLUDED.cash_position,
        margin_utilization = EXCLUDED.margin_utilization`, [
            risk.portfolioId,
            risk.tenantId,
            risk.calculatedAt,
            risk.liquidityScore,
            risk.daysToLiquidate,
            risk.liquidationCost,
            risk.liquidationCostPercent,
            JSON.stringify(risk.positionLiquidity),
            risk.cashPosition,
            risk.marginUtilization,
        ]);
    }
}
exports.RiskAnalyticsService = RiskAnalyticsService;

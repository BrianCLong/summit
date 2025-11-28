/**
 * Market Data & Analytics Service
 *
 * Handles market data aggregation, security master, corporate actions,
 * and execution quality analytics (Transaction Cost Analysis).
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  MarketDataPoint,
  SecurityMaster,
  CorporateAction,
  ExecutionQuality,
  Trade,
} from '../types.js';

interface MarketDataConfig {
  defaultCurrency: string;
  vwapCalculationWindow: number;
  twapCalculationWindow: number;
  marketImpactCoefficient: number;
}

const DEFAULT_CONFIG: MarketDataConfig = {
  defaultCurrency: 'USD',
  vwapCalculationWindow: 390, // minutes (full trading day)
  twapCalculationWindow: 390,
  marketImpactCoefficient: 0.1,
};

export class MarketDataService {
  private config: MarketDataConfig;

  constructor(
    private pg: Pool,
    config?: Partial<MarketDataConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // MARKET DATA OPERATIONS
  // ============================================================================

  /**
   * Ingest real-time market data point
   */
  async ingestMarketData(data: MarketDataPoint): Promise<void> {
    await this.pg.query(
      `INSERT INTO market_data_realtime (
        symbol, timestamp, open, high, low, close, volume,
        bid, ask, bid_size, ask_size, last_price, last_size, vwap, turnover
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (symbol, timestamp) DO UPDATE SET
        high = GREATEST(market_data_realtime.high, EXCLUDED.high),
        low = LEAST(market_data_realtime.low, EXCLUDED.low),
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        last_price = EXCLUDED.last_price`,
      [
        data.symbol,
        data.timestamp,
        data.open,
        data.high,
        data.low,
        data.close,
        data.volume,
        data.bid,
        data.ask,
        data.bidSize,
        data.askSize,
        data.lastPrice,
        data.lastSize,
        data.vwap,
        data.turnover,
      ],
    );
  }

  /**
   * Get current market data for a symbol
   */
  async getCurrentMarketData(symbol: string): Promise<MarketDataPoint | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM market_data_realtime
       WHERE symbol = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [symbol],
    );

    return rows[0] ? this.mapMarketDataRow(rows[0]) : null;
  }

  /**
   * Get historical market data
   */
  async getHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: 'minute' | 'hour' | 'day' = 'day',
  ): Promise<MarketDataPoint[]> {
    let tableName: string;
    let dateColumn: string;

    switch (interval) {
      case 'minute':
        tableName = 'market_data_realtime';
        dateColumn = 'timestamp';
        break;
      case 'hour':
        tableName = 'market_data_hourly';
        dateColumn = 'hour';
        break;
      case 'day':
      default:
        tableName = 'market_data_daily';
        dateColumn = 'trade_date';
        break;
    }

    const { rows } = await this.pg.query(
      `SELECT * FROM ${tableName}
       WHERE symbol = $1
         AND ${dateColumn} >= $2
         AND ${dateColumn} <= $3
       ORDER BY ${dateColumn} ASC`,
      [symbol, startDate, endDate],
    );

    return rows.map((r: Record<string, unknown>) => this.mapMarketDataRow(r));
  }

  /**
   * Calculate VWAP for a symbol and time period
   */
  async calculateVWAP(
    symbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    const { rows } = await this.pg.query(
      `SELECT
         SUM(close * volume) / NULLIF(SUM(volume), 0) as vwap
       FROM market_data_realtime
       WHERE symbol = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [symbol, startTime, endTime],
    );

    return parseFloat(rows[0]?.vwap || '0');
  }

  /**
   * Calculate TWAP for a symbol and time period
   */
  async calculateTWAP(
    symbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    const { rows } = await this.pg.query(
      `SELECT AVG(close) as twap
       FROM market_data_realtime
       WHERE symbol = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [symbol, startTime, endTime],
    );

    return parseFloat(rows[0]?.twap || '0');
  }

  /**
   * Aggregate intraday data to daily
   */
  async aggregateDailyData(tradeDate: Date): Promise<void> {
    await this.pg.query(
      `INSERT INTO market_data_daily (
        symbol, trade_date, open, high, low, close, volume, vwap, turnover
      )
      SELECT
        symbol,
        DATE($1) as trade_date,
        (array_agg(open ORDER BY timestamp ASC))[1] as open,
        MAX(high) as high,
        MIN(low) as low,
        (array_agg(close ORDER BY timestamp DESC))[1] as close,
        SUM(volume) as volume,
        SUM(close * volume) / NULLIF(SUM(volume), 0) as vwap,
        SUM(turnover) as turnover
      FROM market_data_realtime
      WHERE DATE(timestamp) = DATE($1)
      GROUP BY symbol
      ON CONFLICT (symbol, trade_date) DO UPDATE SET
        high = GREATEST(market_data_daily.high, EXCLUDED.high),
        low = LEAST(market_data_daily.low, EXCLUDED.low),
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        vwap = EXCLUDED.vwap,
        turnover = EXCLUDED.turnover`,
      [tradeDate],
    );
  }

  // ============================================================================
  // SECURITY MASTER
  // ============================================================================

  /**
   * Get security details
   */
  async getSecurity(symbol: string): Promise<SecurityMaster | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM security_master WHERE symbol = $1`,
      [symbol],
    );

    if (rows.length === 0) return null;

    const security = this.mapSecurityRow(rows[0]);

    // Get corporate actions
    const { rows: actionRows } = await this.pg.query(
      `SELECT * FROM corporate_actions
       WHERE symbol = $1
         AND ex_date >= NOW() - INTERVAL '30 days'
       ORDER BY ex_date DESC`,
      [symbol],
    );

    security.corporateActions = actionRows.map((r: Record<string, unknown>) =>
      this.mapCorporateActionRow(r),
    );

    return security;
  }

  /**
   * Search securities
   */
  async searchSecurities(
    query: string,
    filters?: {
      assetClass?: string;
      sector?: string;
      exchange?: string;
      country?: string;
      status?: 'active' | 'suspended' | 'delisted';
      limit?: number;
    },
  ): Promise<SecurityMaster[]> {
    const conditions: string[] = [
      `(symbol ILIKE $1 OR name ILIKE $1 OR isin ILIKE $1)`,
    ];
    const params: unknown[] = [`%${query}%`];
    let paramIndex = 2;

    if (filters?.assetClass) {
      conditions.push(`asset_class = $${paramIndex}`);
      params.push(filters.assetClass);
      paramIndex++;
    }

    if (filters?.sector) {
      conditions.push(`sector = $${paramIndex}`);
      params.push(filters.sector);
      paramIndex++;
    }

    if (filters?.exchange) {
      conditions.push(`exchange = $${paramIndex}`);
      params.push(filters.exchange);
      paramIndex++;
    }

    if (filters?.country) {
      conditions.push(`country = $${paramIndex}`);
      params.push(filters.country);
      paramIndex++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const limit = filters?.limit || 50;

    const { rows } = await this.pg.query(
      `SELECT * FROM security_master
       WHERE ${conditions.join(' AND ')}
       ORDER BY symbol
       LIMIT $${paramIndex}`,
      [...params, limit],
    );

    return rows.map((r: Record<string, unknown>) => this.mapSecurityRow(r));
  }

  /**
   * Update security master record
   */
  async upsertSecurity(security: SecurityMaster): Promise<void> {
    await this.pg.query(
      `INSERT INTO security_master (
        symbol, isin, cusip, sedol, figi, name, asset_class, sector, industry,
        exchange, currency, country, lot_size, tick_size, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (symbol) DO UPDATE SET
        isin = EXCLUDED.isin,
        cusip = EXCLUDED.cusip,
        sedol = EXCLUDED.sedol,
        figi = EXCLUDED.figi,
        name = EXCLUDED.name,
        asset_class = EXCLUDED.asset_class,
        sector = EXCLUDED.sector,
        industry = EXCLUDED.industry,
        exchange = EXCLUDED.exchange,
        currency = EXCLUDED.currency,
        country = EXCLUDED.country,
        lot_size = EXCLUDED.lot_size,
        tick_size = EXCLUDED.tick_size,
        status = EXCLUDED.status,
        updated_at = NOW()`,
      [
        security.symbol,
        security.isin,
        security.cusip,
        security.sedol,
        security.figi,
        security.name,
        security.assetClass,
        security.sector,
        security.industry,
        security.exchange,
        security.currency,
        security.country,
        security.lotSize,
        security.tickSize,
        security.status,
      ],
    );
  }

  // ============================================================================
  // CORPORATE ACTIONS
  // ============================================================================

  /**
   * Record a corporate action
   */
  async recordCorporateAction(action: CorporateAction): Promise<void> {
    await this.pg.query(
      `INSERT INTO corporate_actions (
        action_id, action_type, symbol, ex_date, record_date, payment_date,
        ratio, amount, currency, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (action_id) DO UPDATE SET
        ratio = EXCLUDED.ratio,
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        updated_at = NOW()`,
      [
        action.actionId,
        action.actionType,
        action.symbol,
        action.exDate,
        action.recordDate,
        action.paymentDate,
        action.ratio,
        action.amount,
        action.currency,
        action.description,
      ],
    );
  }

  /**
   * Get upcoming corporate actions
   */
  async getUpcomingCorporateActions(
    symbols?: string[],
    daysAhead: number = 30,
  ): Promise<CorporateAction[]> {
    let sql = `
      SELECT * FROM corporate_actions
      WHERE ex_date >= NOW()
        AND ex_date <= NOW() + INTERVAL '${daysAhead} days'
    `;
    const params: unknown[] = [];

    if (symbols && symbols.length > 0) {
      sql += ` AND symbol = ANY($1)`;
      params.push(symbols);
    }

    sql += ` ORDER BY ex_date ASC`;

    const { rows } = await this.pg.query(sql, params);
    return rows.map((r: Record<string, unknown>) => this.mapCorporateActionRow(r));
  }

  /**
   * Process corporate action adjustments
   */
  async processCorporateAction(actionId: string): Promise<void> {
    const { rows } = await this.pg.query(
      `SELECT * FROM corporate_actions WHERE action_id = $1`,
      [actionId],
    );

    if (rows.length === 0) {
      throw new Error('Corporate action not found');
    }

    const action = this.mapCorporateActionRow(rows[0]);

    switch (action.actionType) {
      case 'split':
        await this.processStockSplit(action);
        break;
      case 'dividend':
        await this.processDividend(action);
        break;
      case 'merger':
        await this.processMerger(action);
        break;
      default:
        // Log and skip other types for now
        break;
    }

    // Mark as processed
    await this.pg.query(
      `UPDATE corporate_actions SET processed = true, processed_at = NOW() WHERE action_id = $1`,
      [actionId],
    );
  }

  private async processStockSplit(action: CorporateAction): Promise<void> {
    if (!action.ratio) return;

    // Adjust historical prices
    await this.pg.query(
      `UPDATE market_data_daily
       SET
         open = open / $2,
         high = high / $2,
         low = low / $2,
         close = close / $2,
         volume = volume * $2
       WHERE symbol = $1 AND trade_date < $3`,
      [action.symbol, action.ratio, action.exDate],
    );

    // Adjust position quantities
    await this.pg.query(
      `UPDATE portfolio_positions
       SET
         quantity = quantity * $2,
         cost_basis = cost_basis / $2
       WHERE symbol = $1`,
      [action.symbol, action.ratio],
    );
  }

  private async processDividend(action: CorporateAction): Promise<void> {
    // Record dividend payments for positions held on record date
    if (!action.amount || !action.recordDate) return;

    await this.pg.query(
      `INSERT INTO dividend_payments (
        payment_id, action_id, portfolio_id, symbol, quantity,
        amount_per_share, total_amount, ex_date, payment_date, status
      )
      SELECT
        gen_random_uuid(),
        $1,
        portfolio_id,
        symbol,
        quantity,
        $2,
        quantity * $2,
        $3,
        $4,
        'pending'
      FROM portfolio_positions
      WHERE symbol = $5`,
      [
        action.actionId,
        action.amount,
        action.exDate,
        action.paymentDate,
        action.symbol,
      ],
    );
  }

  private async processMerger(action: CorporateAction): Promise<void> {
    // Merger processing would involve complex logic
    // This is a placeholder for the actual implementation
  }

  // ============================================================================
  // EXECUTION QUALITY (TCA)
  // ============================================================================

  /**
   * Analyze execution quality for a trade
   */
  async analyzeExecutionQuality(trade: Trade): Promise<ExecutionQuality> {
    // Get arrival price (price at time order was placed)
    const arrivalPrice = await this.getArrivalPrice(trade.symbol, trade.executionTime);

    // Get benchmark prices
    const dayStart = new Date(trade.executionTime);
    dayStart.setHours(9, 30, 0, 0);
    const dayEnd = new Date(trade.executionTime);
    dayEnd.setHours(16, 0, 0, 0);

    const vwap = await this.calculateVWAP(trade.symbol, dayStart, dayEnd);
    const twap = await this.calculateTWAP(trade.symbol, dayStart, dayEnd);

    // Get closing price
    const { rows } = await this.pg.query(
      `SELECT close FROM market_data_daily
       WHERE symbol = $1 AND trade_date = DATE($2)`,
      [trade.symbol, trade.executionTime],
    );
    const closingPrice = parseFloat(rows[0]?.close || trade.price.toString());

    // Calculate slippages
    const direction = trade.side === 'buy' ? 1 : -1;
    const implementationShortfall = direction * (trade.price - arrivalPrice) / arrivalPrice * 10000; // bps
    const vwapSlippage = direction * (trade.price - vwap) / vwap * 10000;
    const twapSlippage = direction * (trade.price - twap) / twap * 10000;

    // Estimate market impact and timing cost
    const marketImpact = await this.estimateMarketImpact(trade);
    const timingCost = implementationShortfall - marketImpact;

    // Calculate participation rate
    const volumeInWindow = await this.getVolumeInWindow(
      trade.symbol,
      trade.executionTime,
      60, // 1 hour window
    );
    const participationRate = volumeInWindow > 0 ? trade.quantity / volumeInWindow : 0;

    const executionQuality: ExecutionQuality = {
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      executedPrice: trade.price,
      arrivalPrice,
      vwap,
      twap,
      closingPrice,
      implementationShortfall,
      vwapSlippage,
      twapSlippage,
      marketImpact,
      timingCost,
      executionVenue: trade.venue,
      executionTime: trade.executionTime,
      orderDuration: 0, // Would need order timestamp
      participationRate,
    };

    // Store results
    await this.storeExecutionQuality(executionQuality);

    return executionQuality;
  }

  /**
   * Get aggregated TCA report for a portfolio
   */
  async getTCAReport(
    tenantId: string,
    portfolioId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalTrades: number;
      totalVolume: number;
      totalNotional: number;
      avgImplementationShortfall: number;
      avgVwapSlippage: number;
      avgMarketImpact: number;
      avgParticipationRate: number;
    };
    byVenue: Array<{
      venue: string;
      trades: number;
      avgSlippage: number;
    }>;
    bySymbol: Array<{
      symbol: string;
      trades: number;
      avgSlippage: number;
    }>;
    worstExecutions: ExecutionQuality[];
    bestExecutions: ExecutionQuality[];
  }> {
    // Summary statistics
    const { rows: summaryRows } = await this.pg.query(
      `SELECT
         COUNT(*) as total_trades,
         SUM(quantity) as total_volume,
         SUM(quantity * executed_price) as total_notional,
         AVG(implementation_shortfall) as avg_is,
         AVG(vwap_slippage) as avg_vwap,
         AVG(market_impact) as avg_impact,
         AVG(participation_rate) as avg_participation
       FROM execution_quality eq
       JOIN trades t ON eq.trade_id = t.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
         ${portfolioId ? 'AND t.portfolio_id = $4' : ''}`,
      portfolioId ? [tenantId, startDate, endDate, portfolioId] : [tenantId, startDate, endDate],
    );

    // By venue
    const { rows: venueRows } = await this.pg.query(
      `SELECT
         execution_venue as venue,
         COUNT(*) as trades,
         AVG(vwap_slippage) as avg_slippage
       FROM execution_quality eq
       JOIN trades t ON eq.trade_id = t.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
       GROUP BY execution_venue
       ORDER BY COUNT(*) DESC`,
      [tenantId, startDate, endDate],
    );

    // By symbol
    const { rows: symbolRows } = await this.pg.query(
      `SELECT
         eq.symbol,
         COUNT(*) as trades,
         AVG(vwap_slippage) as avg_slippage
       FROM execution_quality eq
       JOIN trades t ON eq.trade_id = t.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
       GROUP BY eq.symbol
       ORDER BY COUNT(*) DESC
       LIMIT 20`,
      [tenantId, startDate, endDate],
    );

    // Worst executions
    const { rows: worstRows } = await this.pg.query(
      `SELECT eq.*
       FROM execution_quality eq
       JOIN trades t ON eq.trade_id = t.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
       ORDER BY implementation_shortfall DESC
       LIMIT 10`,
      [tenantId, startDate, endDate],
    );

    // Best executions
    const { rows: bestRows } = await this.pg.query(
      `SELECT eq.*
       FROM execution_quality eq
       JOIN trades t ON eq.trade_id = t.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
       ORDER BY implementation_shortfall ASC
       LIMIT 10`,
      [tenantId, startDate, endDate],
    );

    const summary = summaryRows[0] || {};

    return {
      summary: {
        totalTrades: parseInt(summary.total_trades || '0', 10),
        totalVolume: parseFloat(summary.total_volume || '0'),
        totalNotional: parseFloat(summary.total_notional || '0'),
        avgImplementationShortfall: parseFloat(summary.avg_is || '0'),
        avgVwapSlippage: parseFloat(summary.avg_vwap || '0'),
        avgMarketImpact: parseFloat(summary.avg_impact || '0'),
        avgParticipationRate: parseFloat(summary.avg_participation || '0'),
      },
      byVenue: venueRows.map((r: { venue: string; trades: string; avg_slippage: string }) => ({
        venue: r.venue,
        trades: parseInt(r.trades, 10),
        avgSlippage: parseFloat(r.avg_slippage),
      })),
      bySymbol: symbolRows.map((r: { symbol: string; trades: string; avg_slippage: string }) => ({
        symbol: r.symbol,
        trades: parseInt(r.trades, 10),
        avgSlippage: parseFloat(r.avg_slippage),
      })),
      worstExecutions: worstRows.map((r: Record<string, unknown>) => this.mapExecutionQualityRow(r)),
      bestExecutions: bestRows.map((r: Record<string, unknown>) => this.mapExecutionQualityRow(r)),
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getArrivalPrice(symbol: string, executionTime: Date): Promise<number> {
    // Get the price just before order was placed
    const { rows } = await this.pg.query(
      `SELECT last_price FROM market_data_realtime
       WHERE symbol = $1 AND timestamp < $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [symbol, executionTime],
    );

    return parseFloat(rows[0]?.last_price || '0');
  }

  private async estimateMarketImpact(trade: Trade): Promise<number> {
    // Simplified market impact model
    const { rows } = await this.pg.query(
      `SELECT AVG(volume) as avg_volume
       FROM market_data_daily
       WHERE symbol = $1 AND trade_date >= NOW() - INTERVAL '30 days'`,
      [trade.symbol],
    );

    const avgVolume = parseFloat(rows[0]?.avg_volume || '1000000');
    const participationRate = trade.quantity / avgVolume;

    // Simple square-root impact model
    const impact = this.config.marketImpactCoefficient *
      Math.sqrt(participationRate) *
      10000; // Convert to bps

    return trade.side === 'buy' ? impact : -impact;
  }

  private async getVolumeInWindow(
    symbol: string,
    centerTime: Date,
    windowMinutes: number,
  ): Promise<number> {
    const startTime = new Date(centerTime.getTime() - (windowMinutes / 2) * 60000);
    const endTime = new Date(centerTime.getTime() + (windowMinutes / 2) * 60000);

    const { rows } = await this.pg.query(
      `SELECT COALESCE(SUM(volume), 0) as total_volume
       FROM market_data_realtime
       WHERE symbol = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [symbol, startTime, endTime],
    );

    return parseFloat(rows[0]?.total_volume || '0');
  }

  private async storeExecutionQuality(eq: ExecutionQuality): Promise<void> {
    await this.pg.query(
      `INSERT INTO execution_quality (
        trade_id, symbol, side, quantity, executed_price, arrival_price,
        vwap, twap, closing_price, implementation_shortfall, vwap_slippage,
        twap_slippage, market_impact, timing_cost, execution_venue,
        execution_time, order_duration, participation_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (trade_id) DO UPDATE SET
        implementation_shortfall = EXCLUDED.implementation_shortfall,
        vwap_slippage = EXCLUDED.vwap_slippage,
        market_impact = EXCLUDED.market_impact`,
      [
        eq.tradeId,
        eq.symbol,
        eq.side,
        eq.quantity,
        eq.executedPrice,
        eq.arrivalPrice,
        eq.vwap,
        eq.twap,
        eq.closingPrice,
        eq.implementationShortfall,
        eq.vwapSlippage,
        eq.twapSlippage,
        eq.marketImpact,
        eq.timingCost,
        eq.executionVenue,
        eq.executionTime,
        eq.orderDuration,
        eq.participationRate,
      ],
    );
  }

  private mapMarketDataRow(row: Record<string, unknown>): MarketDataPoint {
    return {
      symbol: row.symbol as string,
      timestamp: (row.timestamp || row.trade_date || row.hour) as Date,
      open: parseFloat((row.open as string) || '0'),
      high: parseFloat((row.high as string) || '0'),
      low: parseFloat((row.low as string) || '0'),
      close: parseFloat((row.close as string) || '0'),
      volume: parseFloat((row.volume as string) || '0'),
      bid: row.bid ? parseFloat(row.bid as string) : undefined,
      ask: row.ask ? parseFloat(row.ask as string) : undefined,
      bidSize: row.bid_size ? parseFloat(row.bid_size as string) : undefined,
      askSize: row.ask_size ? parseFloat(row.ask_size as string) : undefined,
      lastPrice: row.last_price ? parseFloat(row.last_price as string) : undefined,
      lastSize: row.last_size ? parseFloat(row.last_size as string) : undefined,
      vwap: row.vwap ? parseFloat(row.vwap as string) : undefined,
      turnover: row.turnover ? parseFloat(row.turnover as string) : undefined,
    };
  }

  private mapSecurityRow(row: Record<string, unknown>): SecurityMaster {
    return {
      symbol: row.symbol as string,
      isin: row.isin as string | undefined,
      cusip: row.cusip as string | undefined,
      sedol: row.sedol as string | undefined,
      figi: row.figi as string | undefined,
      name: row.name as string,
      assetClass: row.asset_class as string,
      sector: row.sector as string | undefined,
      industry: row.industry as string | undefined,
      exchange: row.exchange as string,
      currency: row.currency as string,
      country: row.country as string,
      lotSize: parseInt((row.lot_size as string) || '1', 10),
      tickSize: parseFloat((row.tick_size as string) || '0.01'),
      status: row.status as 'active' | 'suspended' | 'delisted',
    };
  }

  private mapCorporateActionRow(row: Record<string, unknown>): CorporateAction {
    return {
      actionId: row.action_id as string,
      actionType: row.action_type as CorporateAction['actionType'],
      symbol: row.symbol as string,
      exDate: row.ex_date as Date,
      recordDate: row.record_date as Date | undefined,
      paymentDate: row.payment_date as Date | undefined,
      ratio: row.ratio ? parseFloat(row.ratio as string) : undefined,
      amount: row.amount ? parseFloat(row.amount as string) : undefined,
      currency: row.currency as string | undefined,
      description: row.description as string,
    };
  }

  private mapExecutionQualityRow(row: Record<string, unknown>): ExecutionQuality {
    return {
      tradeId: row.trade_id as string,
      symbol: row.symbol as string,
      side: row.side as 'buy' | 'sell',
      quantity: parseFloat((row.quantity as string) || '0'),
      executedPrice: parseFloat((row.executed_price as string) || '0'),
      arrivalPrice: parseFloat((row.arrival_price as string) || '0'),
      vwap: parseFloat((row.vwap as string) || '0'),
      twap: parseFloat((row.twap as string) || '0'),
      closingPrice: parseFloat((row.closing_price as string) || '0'),
      implementationShortfall: parseFloat((row.implementation_shortfall as string) || '0'),
      vwapSlippage: parseFloat((row.vwap_slippage as string) || '0'),
      twapSlippage: parseFloat((row.twap_slippage as string) || '0'),
      marketImpact: parseFloat((row.market_impact as string) || '0'),
      timingCost: parseFloat((row.timing_cost as string) || '0'),
      executionVenue: row.execution_venue as string,
      executionTime: row.execution_time as Date,
      orderDuration: parseFloat((row.order_duration as string) || '0'),
      participationRate: parseFloat((row.participation_rate as string) || '0'),
    };
  }
}

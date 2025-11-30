/**
 * Trade Surveillance Service
 *
 * Monitors trading activity for regulatory compliance and market manipulation.
 * Detects wash trading, layering, spoofing, front-running, and other violations.
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  Trade,
  Order,
  SurveillanceAlert,
  SurveillanceAlertType,
  AlertSeverity,
  AlertStatus,
  PatternMatch,
  SurveillanceEvidence,
} from '../types.js';

interface SurveillanceConfig {
  washTradingTimeWindowMs: number;
  washTradingMinTrades: number;
  layeringCancelRatioThreshold: number;
  layeringTimeWindowMs: number;
  spoofingMinOrderSize: number;
  spoofingCancelTimeMs: number;
  unusualVolumeMultiplier: number;
  positionLimitCheckEnabled: boolean;
}

const DEFAULT_CONFIG: SurveillanceConfig = {
  washTradingTimeWindowMs: 60000, // 1 minute
  washTradingMinTrades: 3,
  layeringCancelRatioThreshold: 0.8,
  layeringTimeWindowMs: 300000, // 5 minutes
  spoofingMinOrderSize: 10000,
  spoofingCancelTimeMs: 5000,
  unusualVolumeMultiplier: 3,
  positionLimitCheckEnabled: true,
};

export class TradeSurveillanceService {
  private config: SurveillanceConfig;
  private restrictedList: Set<string> = new Set();
  private positionLimits: Map<string, number> = new Map();

  constructor(
    private pg: Pool,
    config?: Partial<SurveillanceConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadRestrictedList();
    this.loadPositionLimits();
  }

  // ============================================================================
  // REAL-TIME TRADE ANALYSIS
  // ============================================================================

  /**
   * Analyze a trade for potential violations
   */
  async analyzeTrade(trade: Trade): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Check restricted list
    const restrictedAlert = await this.checkRestrictedList(trade);
    if (restrictedAlert) alerts.push(restrictedAlert);

    // Check for wash trading
    const washTradingAlert = await this.detectWashTrading(trade);
    if (washTradingAlert) alerts.push(washTradingAlert);

    // Check for unusual volume
    const volumeAlert = await this.detectUnusualVolume(trade);
    if (volumeAlert) alerts.push(volumeAlert);

    // Check position limits
    if (this.config.positionLimitCheckEnabled) {
      const positionAlert = await this.checkPositionLimits(trade);
      if (positionAlert) alerts.push(positionAlert);
    }

    // Store alerts
    for (const alert of alerts) {
      await this.storeAlert(alert);
    }

    return alerts;
  }

  /**
   * Analyze an order for potential violations (pre-trade)
   */
  async analyzeOrder(order: Order): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Check restricted list
    if (this.restrictedList.has(order.symbol)) {
      alerts.push(
        this.createAlert({
          tenantId: order.tenantId,
          alertType: 'restricted_list_violation',
          severity: 'critical',
          title: `Restricted List Violation: ${order.symbol}`,
          description: `Order placed for restricted security ${order.symbol}. Order ID: ${order.orderId}`,
          orders: [order.orderId],
          traders: [order.traderId],
          symbols: [order.symbol],
          confidence: 1.0,
        }),
      );
    }

    // Check for layering pattern
    const layeringAlert = await this.detectLayering(order);
    if (layeringAlert) alerts.push(layeringAlert);

    // Check for spoofing
    const spoofingAlert = await this.detectSpoofing(order);
    if (spoofingAlert) alerts.push(spoofingAlert);

    for (const alert of alerts) {
      await this.storeAlert(alert);
    }

    return alerts;
  }

  // ============================================================================
  // PATTERN DETECTION ALGORITHMS
  // ============================================================================

  /**
   * Detect wash trading - trades between related accounts to create artificial volume
   */
  private async detectWashTrading(trade: Trade): Promise<SurveillanceAlert | null> {
    const windowStart = new Date(trade.executionTime.getTime() - this.config.washTradingTimeWindowMs);

    // Find offsetting trades in the same symbol
    const { rows } = await this.pg.query(
      `SELECT * FROM trades
       WHERE tenant_id = $1
         AND symbol = $2
         AND execution_time >= $3
         AND execution_time <= $4
         AND side != $5
         AND ABS(quantity - $6) / GREATEST(quantity, $6) < 0.1
         AND ABS(price - $7) / price < 0.01`,
      [
        trade.tenantId,
        trade.symbol,
        windowStart,
        trade.executionTime,
        trade.side,
        trade.quantity,
        trade.price,
      ],
    );

    if (rows.length >= this.config.washTradingMinTrades) {
      // Check if accounts are related
      const accountIds = [trade.accountId, ...rows.map((r: { account_id: string }) => r.account_id)];
      const relatedAccounts = await this.checkAccountRelationships(accountIds);

      if (relatedAccounts.length > 1) {
        const patterns: PatternMatch[] = [{
          patternType: 'wash_trading',
          confidence: 0.85,
          startTime: windowStart,
          endTime: trade.executionTime,
          description: `Detected ${rows.length + 1} offsetting trades between related accounts`,
          dataPoints: rows.map((r: Record<string, unknown>) => ({
            tradeId: r.trade_id,
            accountId: r.account_id,
            side: r.side,
            quantity: r.quantity,
            price: r.price,
          })),
        }];

        return this.createAlert({
          tenantId: trade.tenantId,
          alertType: 'wash_trading',
          severity: 'high',
          title: `Potential Wash Trading Detected: ${trade.symbol}`,
          description: `${rows.length + 1} offsetting trades detected between related accounts within ${this.config.washTradingTimeWindowMs / 1000}s window`,
          trades: [trade.tradeId, ...rows.map((r: { trade_id: string }) => r.trade_id)],
          accounts: relatedAccounts,
          symbols: [trade.symbol],
          confidence: 0.85,
          evidence: {
            summary: 'Offsetting trades between related accounts suggest wash trading',
            patterns,
          },
        });
      }
    }

    return null;
  }

  /**
   * Detect layering - placing multiple orders at different price levels and cancelling
   */
  private async detectLayering(order: Order): Promise<SurveillanceAlert | null> {
    const windowStart = new Date(Date.now() - this.config.layeringTimeWindowMs);

    // Get recent order activity for this trader/symbol
    const { rows } = await this.pg.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
         COUNT(*) as total_count,
         COUNT(DISTINCT price) as price_levels
       FROM orders
       WHERE tenant_id = $1
         AND trader_id = $2
         AND symbol = $3
         AND created_at >= $4`,
      [order.tenantId, order.traderId, order.symbol, windowStart],
    );

    const stats = rows[0];
    const cancelRatio = stats.total_count > 0 ? stats.cancelled_count / stats.total_count : 0;

    if (
      cancelRatio >= this.config.layeringCancelRatioThreshold &&
      stats.price_levels >= 3 &&
      stats.total_count >= 5
    ) {
      return this.createAlert({
        tenantId: order.tenantId,
        alertType: 'layering',
        severity: 'high',
        title: `Potential Layering Detected: ${order.symbol}`,
        description: `High cancel ratio (${(cancelRatio * 100).toFixed(1)}%) across ${stats.price_levels} price levels. ${stats.cancelled_count}/${stats.total_count} orders cancelled.`,
        orders: [order.orderId],
        traders: [order.traderId],
        symbols: [order.symbol],
        confidence: 0.75,
        evidence: {
          summary: `Cancel ratio: ${(cancelRatio * 100).toFixed(1)}%, Price levels: ${stats.price_levels}`,
          patterns: [{
            patternType: 'layering',
            confidence: 0.75,
            startTime: windowStart,
            endTime: new Date(),
            description: 'Multiple orders at different price levels with high cancellation rate',
            dataPoints: [{
              cancelRatio,
              priceLevels: stats.price_levels,
              totalOrders: stats.total_count,
              cancelledOrders: stats.cancelled_count,
            }],
          }],
        },
      });
    }

    return null;
  }

  /**
   * Detect spoofing - large orders placed and quickly cancelled to move prices
   */
  private async detectSpoofing(order: Order): Promise<SurveillanceAlert | null> {
    if (order.quantity < this.config.spoofingMinOrderSize) {
      return null;
    }

    // Check if this trader has a pattern of large cancelled orders
    const windowStart = new Date(Date.now() - 3600000); // 1 hour

    const { rows } = await this.pg.query(
      `SELECT
         order_id,
         quantity,
         EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as duration_ms
       FROM orders
       WHERE tenant_id = $1
         AND trader_id = $2
         AND symbol = $3
         AND status = 'cancelled'
         AND quantity >= $4
         AND created_at >= $5
       ORDER BY created_at DESC
       LIMIT 10`,
      [order.tenantId, order.traderId, order.symbol, this.config.spoofingMinOrderSize, windowStart],
    );

    const quickCancels = rows.filter(
      (r: { duration_ms: number }) => r.duration_ms < this.config.spoofingCancelTimeMs
    );

    if (quickCancels.length >= 3) {
      return this.createAlert({
        tenantId: order.tenantId,
        alertType: 'spoofing',
        severity: 'critical',
        title: `Potential Spoofing Detected: ${order.symbol}`,
        description: `${quickCancels.length} large orders cancelled within ${this.config.spoofingCancelTimeMs}ms. Pattern suggests intent to manipulate prices.`,
        orders: quickCancels.map((r: { order_id: string }) => r.order_id),
        traders: [order.traderId],
        symbols: [order.symbol],
        confidence: 0.80,
        evidence: {
          summary: `${quickCancels.length} large orders quickly cancelled`,
          patterns: [{
            patternType: 'spoofing',
            confidence: 0.80,
            startTime: windowStart,
            endTime: new Date(),
            description: 'Pattern of large orders cancelled before execution',
            dataPoints: quickCancels.map((r: Record<string, unknown>) => ({
              orderId: r.order_id,
              quantity: r.quantity,
              durationMs: r.duration_ms,
            })),
          }],
        },
      });
    }

    return null;
  }

  /**
   * Detect unusual volume in a security
   */
  private async detectUnusualVolume(trade: Trade): Promise<SurveillanceAlert | null> {
    // Get average daily volume for this symbol
    const { rows } = await this.pg.query(
      `SELECT
         COALESCE(AVG(daily_volume), 0) as avg_volume,
         COALESCE(STDDEV(daily_volume), 0) as stddev_volume
       FROM (
         SELECT DATE(execution_time) as trade_date, SUM(quantity) as daily_volume
         FROM trades
         WHERE tenant_id = $1
           AND symbol = $2
           AND execution_time >= NOW() - INTERVAL '30 days'
           AND execution_time < DATE(NOW())
         GROUP BY DATE(execution_time)
       ) daily`,
      [trade.tenantId, trade.symbol],
    );

    const avgVolume = parseFloat(rows[0]?.avg_volume || '0');
    const stddevVolume = parseFloat(rows[0]?.stddev_volume || '0');

    if (avgVolume === 0) return null;

    // Get today's volume
    const { rows: todayRows } = await this.pg.query(
      `SELECT COALESCE(SUM(quantity), 0) as today_volume
       FROM trades
       WHERE tenant_id = $1
         AND symbol = $2
         AND DATE(execution_time) = DATE(NOW())`,
      [trade.tenantId, trade.symbol],
    );

    const todayVolume = parseFloat(todayRows[0]?.today_volume || '0');
    const volumeRatio = todayVolume / avgVolume;

    if (volumeRatio >= this.config.unusualVolumeMultiplier) {
      const zScore = stddevVolume > 0 ? (todayVolume - avgVolume) / stddevVolume : 0;

      return this.createAlert({
        tenantId: trade.tenantId,
        alertType: 'unusual_volume',
        severity: zScore > 4 ? 'high' : 'medium',
        title: `Unusual Volume Detected: ${trade.symbol}`,
        description: `Today's volume (${todayVolume.toLocaleString()}) is ${volumeRatio.toFixed(1)}x the 30-day average (${avgVolume.toLocaleString()})`,
        trades: [trade.tradeId],
        symbols: [trade.symbol],
        confidence: Math.min(0.9, 0.5 + (volumeRatio - this.config.unusualVolumeMultiplier) * 0.1),
        evidence: {
          summary: `Volume ratio: ${volumeRatio.toFixed(2)}x, Z-score: ${zScore.toFixed(2)}`,
          patterns: [{
            patternType: 'unusual_volume',
            confidence: 0.7,
            startTime: new Date(Date.now() - 86400000),
            endTime: new Date(),
            description: 'Trading volume significantly above historical average',
            dataPoints: [{
              todayVolume,
              avgVolume,
              volumeRatio,
              zScore,
            }],
          }],
        },
      });
    }

    return null;
  }

  /**
   * Check if trade violates position limits
   */
  private async checkPositionLimits(trade: Trade): Promise<SurveillanceAlert | null> {
    const limit = this.positionLimits.get(trade.symbol);
    if (!limit) return null;

    // Get current position
    const { rows } = await this.pg.query(
      `SELECT
         COALESCE(SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END), 0) as net_position
       FROM trades
       WHERE tenant_id = $1
         AND account_id = $2
         AND symbol = $3
         AND status = 'filled'`,
      [trade.tenantId, trade.accountId, trade.symbol],
    );

    const currentPosition = parseFloat(rows[0]?.net_position || '0');
    const newPosition = currentPosition + (trade.side === 'buy' ? trade.quantity : -trade.quantity);

    if (Math.abs(newPosition) > limit) {
      return this.createAlert({
        tenantId: trade.tenantId,
        alertType: 'position_limit_breach',
        severity: 'critical',
        title: `Position Limit Breach: ${trade.symbol}`,
        description: `Position of ${newPosition.toLocaleString()} exceeds limit of ${limit.toLocaleString()}`,
        trades: [trade.tradeId],
        accounts: [trade.accountId],
        symbols: [trade.symbol],
        confidence: 1.0,
        evidence: {
          summary: `Position: ${newPosition}, Limit: ${limit}`,
        },
      });
    }

    return null;
  }

  /**
   * Check if symbol is on restricted list
   */
  private async checkRestrictedList(trade: Trade): Promise<SurveillanceAlert | null> {
    if (!this.restrictedList.has(trade.symbol)) return null;

    return this.createAlert({
      tenantId: trade.tenantId,
      alertType: 'restricted_list_violation',
      severity: 'critical',
      title: `Restricted List Violation: ${trade.symbol}`,
      description: `Trade executed in restricted security ${trade.symbol}. This requires immediate review.`,
      trades: [trade.tradeId],
      traders: [trade.traderId],
      accounts: [trade.accountId],
      symbols: [trade.symbol],
      confidence: 1.0,
      evidence: {
        summary: 'Trade in restricted security',
      },
    });
  }

  // ============================================================================
  // BATCH ANALYSIS
  // ============================================================================

  /**
   * Run end-of-day surveillance analysis
   */
  async runEndOfDayAnalysis(tenantId: string, date: Date): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Analyze cross-account trading patterns
    const crossAccountAlerts = await this.analyzeCrossAccountPatterns(tenantId, date);
    alerts.push(...crossAccountAlerts);

    // Analyze best execution compliance
    const bestExecAlerts = await this.analyzeBestExecution(tenantId, date);
    alerts.push(...bestExecAlerts);

    // Analyze trading around announcements
    const announcementAlerts = await this.analyzeAnnouncementTrading(tenantId, date);
    alerts.push(...announcementAlerts);

    return alerts;
  }

  /**
   * Analyze cross-account trading patterns
   */
  private async analyzeCrossAccountPatterns(tenantId: string, date: Date): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Find suspicious cross-account patterns
    const { rows } = await this.pg.query(
      `WITH account_pairs AS (
         SELECT
           t1.account_id as account1,
           t2.account_id as account2,
           t1.symbol,
           COUNT(*) as trade_count,
           SUM(t1.quantity) as total_quantity
         FROM trades t1
         JOIN trades t2 ON
           t1.tenant_id = t2.tenant_id
           AND t1.symbol = t2.symbol
           AND t1.side != t2.side
           AND ABS(EXTRACT(EPOCH FROM (t1.execution_time - t2.execution_time))) < 60
           AND t1.account_id != t2.account_id
           AND t1.trade_id < t2.trade_id
         WHERE t1.tenant_id = $1
           AND DATE(t1.execution_time) = $2
         GROUP BY t1.account_id, t2.account_id, t1.symbol
         HAVING COUNT(*) >= 3
       )
       SELECT * FROM account_pairs ORDER BY trade_count DESC LIMIT 50`,
      [tenantId, date],
    );

    for (const row of rows) {
      alerts.push(
        this.createAlert({
          tenantId,
          alertType: 'wash_trading',
          severity: 'high',
          title: `Suspicious Cross-Account Activity: ${row.symbol}`,
          description: `${row.trade_count} matching trades between accounts ${row.account1} and ${row.account2}`,
          accounts: [row.account1, row.account2],
          symbols: [row.symbol],
          confidence: 0.75,
          evidence: {
            summary: `${row.trade_count} matching trades, ${row.total_quantity} total quantity`,
          },
        }),
      );
    }

    return alerts;
  }

  /**
   * Analyze best execution compliance
   */
  private async analyzeBestExecution(tenantId: string, date: Date): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Find trades with poor execution quality
    const { rows } = await this.pg.query(
      `SELECT
         t.trade_id,
         t.symbol,
         t.side,
         t.price,
         t.quantity,
         t.trader_id,
         m.vwap,
         ABS(t.price - m.vwap) / m.vwap as slippage
       FROM trades t
       JOIN market_data_daily m ON
         t.symbol = m.symbol
         AND DATE(t.execution_time) = m.trade_date
       WHERE t.tenant_id = $1
         AND DATE(t.execution_time) = $2
         AND t.status = 'filled'
         AND m.vwap > 0
         AND ABS(t.price - m.vwap) / m.vwap > 0.02
       ORDER BY slippage DESC
       LIMIT 100`,
      [tenantId, date],
    );

    for (const row of rows) {
      const isBuy = row.side === 'buy';
      const paidMore = isBuy ? row.price > row.vwap : row.price < row.vwap;

      if (paidMore && row.slippage > 0.03) {
        alerts.push(
          this.createAlert({
            tenantId,
            alertType: 'best_execution_failure',
            severity: row.slippage > 0.05 ? 'high' : 'medium',
            title: `Poor Execution Quality: ${row.symbol}`,
            description: `Trade executed ${(row.slippage * 100).toFixed(2)}% ${isBuy ? 'above' : 'below'} VWAP`,
            trades: [row.trade_id],
            traders: [row.trader_id],
            symbols: [row.symbol],
            confidence: 0.85,
            evidence: {
              summary: `Price: ${row.price}, VWAP: ${row.vwap}, Slippage: ${(row.slippage * 100).toFixed(2)}%`,
            },
          }),
        );
      }
    }

    return alerts;
  }

  /**
   * Analyze trading around corporate announcements
   */
  private async analyzeAnnouncementTrading(tenantId: string, date: Date): Promise<SurveillanceAlert[]> {
    const alerts: SurveillanceAlert[] = [];

    // Find trades in symbols with recent announcements
    const { rows } = await this.pg.query(
      `SELECT
         t.trader_id,
         t.symbol,
         ca.action_type,
         ca.ex_date,
         COUNT(*) as trade_count,
         SUM(t.quantity * t.price) as total_value
       FROM trades t
       JOIN corporate_actions ca ON
         t.symbol = ca.symbol
         AND ca.ex_date BETWEEN $2 - INTERVAL '3 days' AND $2 + INTERVAL '1 day'
       WHERE t.tenant_id = $1
         AND DATE(t.execution_time) = $2
         AND t.status = 'filled'
       GROUP BY t.trader_id, t.symbol, ca.action_type, ca.ex_date
       HAVING SUM(t.quantity * t.price) > 100000
       ORDER BY total_value DESC`,
      [tenantId, date],
    );

    for (const row of rows) {
      alerts.push(
        this.createAlert({
          tenantId,
          alertType: 'insider_trading',
          severity: 'high',
          title: `Trading Around Announcement: ${row.symbol}`,
          description: `${row.trade_count} trades totaling $${row.total_value.toLocaleString()} near ${row.action_type} announcement`,
          traders: [row.trader_id],
          symbols: [row.symbol],
          confidence: 0.6,
          evidence: {
            summary: `${row.action_type} on ${row.ex_date}, ${row.trade_count} trades, $${row.total_value}`,
          },
        }),
      );
    }

    return alerts;
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Get alerts for a tenant
   */
  async getAlerts(
    tenantId: string,
    filters?: {
      status?: AlertStatus[];
      severity?: AlertSeverity[];
      alertType?: SurveillanceAlertType[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ alerts: SurveillanceAlert[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters?.status?.length) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.severity?.length) {
      conditions.push(`severity = ANY($${paramIndex})`);
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters?.alertType?.length) {
      conditions.push(`alert_type = ANY($${paramIndex})`);
      params.push(filters.alertType);
      paramIndex++;
    }

    if (filters?.startDate) {
      conditions.push(`detected_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      conditions.push(`detected_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.pg.query(
      `SELECT COUNT(*) FROM surveillance_alerts WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get alerts
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const { rows } = await this.pg.query(
      `SELECT * FROM surveillance_alerts
       WHERE ${whereClause}
       ORDER BY detected_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return {
      alerts: rows.map(this.mapAlertRow),
      total,
    };
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    userId: string,
    notes?: string,
  ): Promise<void> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const params: unknown[] = [alertId, status];
    let paramIndex = 3;

    if (status === 'acknowledged') {
      updates.push(`assigned_to = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (status === 'escalated') {
      updates.push(`escalated_to = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (status === 'resolved' || status === 'false_positive') {
      updates.push(`resolved_at = NOW()`);
      updates.push(`resolved_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
      if (notes) {
        updates.push(`resolution = $${paramIndex}`);
        params.push(notes);
      }
    }

    await this.pg.query(
      `UPDATE surveillance_alerts SET ${updates.join(', ')} WHERE alert_id = $1`,
      params,
    );
  }

  // ============================================================================
  // RESTRICTED LIST MANAGEMENT
  // ============================================================================

  /**
   * Add symbol to restricted list
   */
  async addToRestrictedList(
    tenantId: string,
    symbol: string,
    reason: string,
    addedBy: string,
    expiresAt?: Date,
  ): Promise<void> {
    await this.pg.query(
      `INSERT INTO restricted_list (tenant_id, symbol, reason, added_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, symbol) DO UPDATE SET
         reason = EXCLUDED.reason,
         added_by = EXCLUDED.added_by,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [tenantId, symbol, reason, addedBy, expiresAt],
    );
    this.restrictedList.add(symbol);
  }

  /**
   * Remove symbol from restricted list
   */
  async removeFromRestrictedList(tenantId: string, symbol: string): Promise<void> {
    await this.pg.query(
      `DELETE FROM restricted_list WHERE tenant_id = $1 AND symbol = $2`,
      [tenantId, symbol],
    );
    this.restrictedList.delete(symbol);
  }

  /**
   * Get restricted list
   */
  async getRestrictedList(tenantId: string): Promise<{ symbol: string; reason: string; expiresAt?: Date }[]> {
    const { rows } = await this.pg.query(
      `SELECT symbol, reason, expires_at
       FROM restricted_list
       WHERE tenant_id = $1
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY symbol`,
      [tenantId],
    );
    return rows.map((r: { symbol: string; reason: string; expires_at?: Date }) => ({
      symbol: r.symbol,
      reason: r.reason,
      expiresAt: r.expires_at,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private createAlert(params: {
    tenantId: string;
    alertType: SurveillanceAlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    trades?: string[];
    orders?: string[];
    accounts?: string[];
    traders?: string[];
    symbols?: string[];
    confidence: number;
    evidence: Partial<SurveillanceEvidence>;
  }): SurveillanceAlert {
    return {
      alertId: randomUUID(),
      tenantId: params.tenantId,
      alertType: params.alertType,
      severity: params.severity,
      status: 'open',
      title: params.title,
      description: params.description,
      detectedAt: new Date(),
      trades: params.trades,
      orders: params.orders,
      accounts: params.accounts,
      traders: params.traders,
      symbols: params.symbols,
      confidence: params.confidence,
      evidence: {
        summary: params.evidence.summary || '',
        ...params.evidence,
      },
    };
  }

  private async storeAlert(alert: SurveillanceAlert): Promise<void> {
    await this.pg.query(
      `INSERT INTO surveillance_alerts (
        alert_id, tenant_id, alert_type, severity, status, title, description,
        detected_at, trades, orders, accounts, traders, symbols, confidence, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        alert.alertId,
        alert.tenantId,
        alert.alertType,
        alert.severity,
        alert.status,
        alert.title,
        alert.description,
        alert.detectedAt,
        JSON.stringify(alert.trades || []),
        JSON.stringify(alert.orders || []),
        JSON.stringify(alert.accounts || []),
        JSON.stringify(alert.traders || []),
        JSON.stringify(alert.symbols || []),
        alert.confidence,
        JSON.stringify(alert.evidence),
      ],
    );
  }

  private async checkAccountRelationships(accountIds: string[]): Promise<string[]> {
    // Check for related accounts (same beneficial owner, same address, etc.)
    const { rows } = await this.pg.query(
      `SELECT DISTINCT a1.account_id
       FROM accounts a1
       JOIN accounts a2 ON (
         a1.beneficial_owner_id = a2.beneficial_owner_id
         OR a1.tax_id = a2.tax_id
         OR a1.address_hash = a2.address_hash
       )
       WHERE a1.account_id = ANY($1)
         AND a2.account_id = ANY($1)
         AND a1.account_id != a2.account_id`,
      [accountIds],
    );
    return rows.map((r: { account_id: string }) => r.account_id);
  }

  private async loadRestrictedList(): Promise<void> {
    try {
      const { rows } = await this.pg.query(
        `SELECT symbol FROM restricted_list
         WHERE expires_at IS NULL OR expires_at > NOW()`,
      );
      this.restrictedList = new Set(rows.map((r: { symbol: string }) => r.symbol));
    } catch {
      // Table may not exist yet
      this.restrictedList = new Set();
    }
  }

  private async loadPositionLimits(): Promise<void> {
    try {
      const { rows } = await this.pg.query(
        `SELECT symbol, position_limit FROM position_limits`,
      );
      this.positionLimits = new Map(
        rows.map((r: { symbol: string; position_limit: number }) => [r.symbol, r.position_limit]),
      );
    } catch {
      // Table may not exist yet
      this.positionLimits = new Map();
    }
  }

  private mapAlertRow(row: Record<string, unknown>): SurveillanceAlert {
    return {
      alertId: row.alert_id as string,
      tenantId: row.tenant_id as string,
      alertType: row.alert_type as SurveillanceAlertType,
      severity: row.severity as AlertSeverity,
      status: row.status as AlertStatus,
      title: row.title as string,
      description: row.description as string,
      detectedAt: row.detected_at as Date,
      trades: JSON.parse((row.trades as string) || '[]'),
      orders: JSON.parse((row.orders as string) || '[]'),
      accounts: JSON.parse((row.accounts as string) || '[]'),
      traders: JSON.parse((row.traders as string) || '[]'),
      symbols: JSON.parse((row.symbols as string) || '[]'),
      confidence: row.confidence as number,
      evidence: JSON.parse((row.evidence as string) || '{}'),
      assignedTo: row.assigned_to as string | undefined,
      escalatedTo: row.escalated_to as string | undefined,
      resolvedAt: row.resolved_at as Date | undefined,
      resolvedBy: row.resolved_by as string | undefined,
      resolution: row.resolution as string | undefined,
    };
  }
}

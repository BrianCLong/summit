import type {
  Transaction,
  Party,
  Account,
  FlowPattern,
  FlowQuery,
  FlowQueryResult,
  AggregatedFlow,
  MonetaryAmount,
} from '@intelgraph/finance-normalizer-types';
import { createMonetaryAmount, addMonetaryAmounts } from '@intelgraph/finance-normalizer-types';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Query Service
 * Provides APIs for querying transactions, flows, and patterns
 */
export class QueryService {
  /**
   * Query flows between entities
   */
  async queryFlows(query: FlowQuery, tenantId: string): Promise<FlowQueryResult> {
    const startTime = Date.now();

    // Build WHERE clause
    const conditions: string[] = ['t.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    // Entity filter
    if (query.entityType === 'PARTY') {
      conditions.push(
        `(t.originator_id = ANY($${paramIndex}) OR t.beneficiary_id = ANY($${paramIndex}))`
      );
    } else {
      conditions.push(
        `(t.source_account_id = ANY($${paramIndex}) OR t.destination_account_id = ANY($${paramIndex}))`
      );
    }
    params.push(query.entityIds);
    paramIndex++;

    // Counterparty filter
    if (query.counterpartyIds && query.counterpartyIds.length > 0) {
      if (query.entityType === 'PARTY') {
        conditions.push(
          `(t.originator_id = ANY($${paramIndex}) OR t.beneficiary_id = ANY($${paramIndex}))`
        );
      } else {
        conditions.push(
          `(t.source_account_id = ANY($${paramIndex}) OR t.destination_account_id = ANY($${paramIndex}))`
        );
      }
      params.push(query.counterpartyIds);
      paramIndex++;
    }

    // Date range
    conditions.push(`t.value_date >= $${paramIndex}`);
    params.push(query.periodStart);
    paramIndex++;

    conditions.push(`t.value_date <= $${paramIndex}`);
    params.push(query.periodEnd);
    paramIndex++;

    // Amount filter
    if (query.minAmount) {
      conditions.push(`ABS(t.amount_minor_units) >= $${paramIndex}`);
      params.push(query.minAmount.minorUnits.toString());
      paramIndex++;
    }

    if (query.maxAmount) {
      conditions.push(`ABS(t.amount_minor_units) <= $${paramIndex}`);
      params.push(query.maxAmount.minorUnits.toString());
      paramIndex++;
    }

    // Transaction type filter
    if (query.transactionTypes && query.transactionTypes.length > 0) {
      conditions.push(`t.type = ANY($${paramIndex})`);
      params.push(query.transactionTypes);
      paramIndex++;
    }

    // Direction filter
    if (query.direction) {
      conditions.push(`t.direction = $${paramIndex}`);
      params.push(query.direction);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM finance_transactions t WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Handle aggregation
    if (query.aggregation !== 'NONE') {
      return this.queryAggregatedFlows(
        query,
        whereClause,
        params,
        paramIndex,
        totalCount,
        startTime
      );
    }

    // Sort order
    const sortColumn = {
      DATE: 't.value_date',
      AMOUNT: 'ABS(t.amount_minor_units)',
      COUNTERPARTY: 'COALESCE(t.beneficiary_id, t.originator_id)',
    }[query.sortBy];

    // Get transactions
    const queryParams = [...params, query.limit, query.offset];
    const result = await db.query<any>(
      `SELECT t.* FROM finance_transactions t
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${query.sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    const transactions = result.rows.map(this.mapTransactionRow);

    // Calculate summary
    const summary = await this.calculateSummary(whereClause, params, tenantId);

    return {
      query,
      totalCount,
      hasMore: query.offset + transactions.length < totalCount,
      results: transactions,
      summary,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Query aggregated flows
   */
  private async queryAggregatedFlows(
    query: FlowQuery,
    whereClause: string,
    params: unknown[],
    paramIndex: number,
    totalCount: number,
    startTime: number
  ): Promise<FlowQueryResult> {
    const dateFormat = {
      HOURLY: `date_trunc('hour', t.value_date)`,
      DAILY: `date_trunc('day', t.value_date)`,
      WEEKLY: `date_trunc('week', t.value_date)`,
      MONTHLY: `date_trunc('month', t.value_date)`,
    }[query.aggregation] || `date_trunc('day', t.value_date)`;

    const result = await db.query<any>(
      `SELECT
        ${dateFormat} as period_start,
        t.originator_id as source_id,
        t.beneficiary_id as destination_id,
        t.amount_currency as currency,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN t.direction = 'CREDIT' THEN 1 ELSE 0 END) as credit_count,
        SUM(CASE WHEN t.direction = 'DEBIT' THEN 1 ELSE 0 END) as debit_count,
        SUM(ABS(t.amount_minor_units)) as gross_flow,
        SUM(CASE WHEN t.direction = 'CREDIT' THEN t.amount_minor_units ELSE -t.amount_minor_units END) as net_flow,
        MAX(ABS(t.amount_minor_units)) as max_transaction,
        MIN(ABS(t.amount_minor_units)) as min_transaction,
        AVG(ABS(t.amount_minor_units)) as avg_transaction
      FROM finance_transactions t
      WHERE ${whereClause}
        AND t.originator_id IS NOT NULL
        AND t.beneficiary_id IS NOT NULL
      GROUP BY period_start, t.originator_id, t.beneficiary_id, t.amount_currency
      ORDER BY period_start ${query.sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, query.offset]
    );

    const flows: AggregatedFlow[] = result.rows.map((row: any) => ({
      id: `${row.source_id}-${row.destination_id}-${row.period_start}`,
      sourceId: row.source_id,
      sourceType: 'PARTY',
      destinationId: row.destination_id,
      destinationType: 'PARTY',
      periodStart: new Date(row.period_start).toISOString(),
      periodEnd: this.calculatePeriodEnd(row.period_start, query.aggregation),
      granularity: query.aggregation,
      grossFlow: createMonetaryAmount(
        parseInt(row.gross_flow, 10) / 100,
        row.currency || 'USD'
      ),
      netFlow: createMonetaryAmount(
        parseInt(row.net_flow, 10) / 100,
        row.currency || 'USD'
      ),
      transactionCount: parseInt(row.transaction_count, 10),
      creditCount: parseInt(row.credit_count, 10),
      debitCount: parseInt(row.debit_count, 10),
      maxTransaction: createMonetaryAmount(
        parseInt(row.max_transaction, 10) / 100,
        row.currency || 'USD'
      ),
      minTransaction: createMonetaryAmount(
        parseInt(row.min_transaction, 10) / 100,
        row.currency || 'USD'
      ),
      averageTransactionSize: createMonetaryAmount(
        parseFloat(row.avg_transaction) / 100,
        row.currency || 'USD'
      ),
      byTransactionType: [],
      tenantId: query.entityIds[0], // Will be overwritten
      createdAt: new Date().toISOString(),
    }));

    return {
      query,
      totalCount,
      hasMore: query.offset + flows.length < totalCount,
      results: flows,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string, tenantId: string): Promise<Transaction | null> {
    const result = await db.query<any>(
      `SELECT * FROM finance_transactions WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTransactionRow(result.rows[0]);
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    tenantId: string,
    filters: {
      accountId?: string;
      partyId?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      status?: string;
      minAmount?: number;
      maxAmount?: number;
    },
    limit = 50,
    offset = 0
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.accountId) {
      conditions.push(
        `(source_account_id = $${paramIndex} OR destination_account_id = $${paramIndex})`
      );
      params.push(filters.accountId);
      paramIndex++;
    }

    if (filters.partyId) {
      conditions.push(
        `(originator_id = $${paramIndex} OR beneficiary_id = $${paramIndex})`
      );
      params.push(filters.partyId);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`value_date >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`value_date <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.minAmount !== undefined) {
      conditions.push(`ABS(amount_minor_units) >= $${paramIndex}`);
      params.push(filters.minAmount * 100);
      paramIndex++;
    }

    if (filters.maxAmount !== undefined) {
      conditions.push(`ABS(amount_minor_units) <= $${paramIndex}`);
      params.push(filters.maxAmount * 100);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const [txnsResult, countResult] = await Promise.all([
      db.query<any>(
        `SELECT * FROM finance_transactions
         WHERE ${whereClause}
         ORDER BY value_date DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM finance_transactions WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      transactions: txnsResult.rows.map(this.mapTransactionRow),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get party by ID
   */
  async getParty(id: string, tenantId: string): Promise<Party | null> {
    const result = await db.query<any>(
      `SELECT * FROM finance_parties WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPartyRow(result.rows[0]);
  }

  /**
   * Search parties by name
   */
  async searchParties(
    tenantId: string,
    searchTerm: string,
    limit = 20
  ): Promise<Party[]> {
    const result = await db.query<any>(
      `SELECT * FROM finance_parties
       WHERE tenant_id = $1
         AND (canonical_name ILIKE $2 OR original_name ILIKE $2 OR $3 = ANY(aliases))
       ORDER BY canonical_name
       LIMIT $4`,
      [tenantId, `%${searchTerm}%`, searchTerm, limit]
    );

    return result.rows.map(this.mapPartyRow);
  }

  /**
   * Get account by ID
   */
  async getAccount(id: string, tenantId: string): Promise<Account | null> {
    const result = await db.query<any>(
      `SELECT * FROM finance_accounts WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAccountRow(result.rows[0]);
  }

  /**
   * List accounts
   */
  async listAccounts(
    tenantId: string,
    filters: {
      ownerId?: string;
      type?: string;
      status?: string;
      currency?: string;
    },
    limit = 50,
    offset = 0
  ): Promise<{ accounts: Account[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.ownerId) {
      conditions.push(`owner_id = $${paramIndex}`);
      params.push(filters.ownerId);
      paramIndex++;
    }

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.currency) {
      conditions.push(`currency = $${paramIndex}`);
      params.push(filters.currency);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const [accountsResult, countResult] = await Promise.all([
      db.query<any>(
        `SELECT * FROM finance_accounts
         WHERE ${whereClause}
         ORDER BY name
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM finance_accounts WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      accounts: accountsResult.rows.map(this.mapAccountRow),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get detected patterns
   */
  async getPatterns(
    tenantId: string,
    filters: {
      type?: string;
      severity?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      partyId?: string;
    },
    limit = 20,
    offset = 0
  ): Promise<{ patterns: FlowPattern[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex}`);
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`review_status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`period_start >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`period_end <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.partyId) {
      conditions.push(`$${paramIndex} = ANY(primary_party_ids)`);
      params.push(filters.partyId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const [patternsResult, countResult] = await Promise.all([
      db.query<any>(
        `SELECT * FROM finance_flow_patterns
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM finance_flow_patterns WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      patterns: patternsResult.rows.map(this.mapPatternRow),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  // Helper methods

  private async calculateSummary(
    whereClause: string,
    params: unknown[],
    tenantId: string
  ): Promise<FlowQueryResult['summary']> {
    const result = await db.query<any>(
      `SELECT
        SUM(ABS(amount_minor_units)) as gross_flow,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor_units ELSE -amount_minor_units END) as net_flow,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT COALESCE(originator_id, beneficiary_id)) as distinct_counterparties,
        AVG(ABS(amount_minor_units)) as avg_transaction,
        MAX(amount_currency) as currency
      FROM finance_transactions t
      WHERE ${whereClause}`,
      params
    );

    const row = result.rows[0];
    const currency = row.currency || 'USD';

    return {
      totalGrossFlow: createMonetaryAmount(
        parseInt(row.gross_flow || '0', 10) / 100,
        currency
      ),
      totalNetFlow: createMonetaryAmount(
        parseInt(row.net_flow || '0', 10) / 100,
        currency
      ),
      transactionCount: parseInt(row.transaction_count || '0', 10),
      distinctCounterparties: parseInt(row.distinct_counterparties || '0', 10),
      averageTransactionSize: row.avg_transaction
        ? createMonetaryAmount(parseFloat(row.avg_transaction) / 100, currency)
        : undefined,
    };
  }

  private calculatePeriodEnd(periodStart: string, granularity: string): string {
    const date = new Date(periodStart);
    switch (granularity) {
      case 'HOURLY':
        date.setHours(date.getHours() + 1);
        break;
      case 'DAILY':
        date.setDate(date.getDate() + 1);
        break;
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
    }
    return date.toISOString();
  }

  private mapTransactionRow(row: any): Transaction {
    return {
      id: row.id,
      referenceNumber: row.reference_number,
      externalId: row.external_id,
      type: row.type,
      status: row.status,
      direction: row.direction,
      sourceAccountId: row.source_account_id,
      destinationAccountId: row.destination_account_id,
      originatorId: row.originator_id,
      beneficiaryId: row.beneficiary_id,
      orderingPartyId: row.ordering_party_id,
      intermediaryId: row.intermediary_id,
      amount: {
        minorUnits: BigInt(row.amount_minor_units || '0'),
        currency: row.amount_currency || 'USD',
        decimalPlaces: row.amount_decimal_places || 2,
      },
      settlementAmount: row.settlement_amount_minor_units
        ? {
            minorUnits: BigInt(row.settlement_amount_minor_units),
            currency: row.settlement_currency || row.amount_currency,
            decimalPlaces: 2,
          }
        : undefined,
      exchangeRate: row.exchange_rate,
      fees: row.fees || [],
      totalFees: row.total_fees_minor_units
        ? {
            minorUnits: BigInt(row.total_fees_minor_units),
            currency: row.amount_currency,
            decimalPlaces: 2,
          }
        : undefined,
      valueDate: row.value_date,
      postingDate: row.posting_date,
      executionDate: row.execution_date,
      settlementDate: row.settlement_date,
      description: row.description,
      remittanceInfo: row.remittance_info,
      purposeCode: row.purpose_code,
      categoryCode: row.category_code,
      reversesTransactionId: row.reverses_transaction_id,
      reversedByTransactionId: row.reversed_by_transaction_id,
      runningBalance: row.running_balance_minor_units
        ? {
            minorUnits: BigInt(row.running_balance_minor_units),
            currency: row.amount_currency,
            decimalPlaces: 2,
          }
        : undefined,
      instrumentId: row.instrument_id,
      quantity: row.quantity,
      unitPrice: row.unit_price_minor_units
        ? {
            minorUnits: BigInt(row.unit_price_minor_units),
            currency: row.amount_currency,
            decimalPlaces: 2,
          }
        : undefined,
      rawRecord: row.raw_record,
      metadata: row.metadata || {},
      provenance: row.provenance || {},
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPartyRow(row: any): Party {
    return {
      id: row.id,
      canonicalName: row.canonical_name,
      originalName: row.original_name,
      aliases: row.aliases || [],
      type: row.type,
      identifiers: row.identifiers || [],
      jurisdiction: row.jurisdiction,
      address: row.address,
      riskClassification: row.risk_classification,
      isPep: row.is_pep || false,
      sanctionsMatch: row.sanctions_match || false,
      metadata: row.metadata || {},
      provenance: row.provenance || {},
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAccountRow(row: any): Account {
    return {
      id: row.id,
      accountNumber: row.account_number,
      accountNumberHash: row.account_number_hash,
      name: row.name,
      type: row.type,
      status: row.status,
      ownerId: row.owner_id,
      institutionId: row.institution_id,
      currency: row.currency,
      balance: row.balance_minor_units
        ? {
            minorUnits: BigInt(row.balance_minor_units),
            currency: row.currency,
            decimalPlaces: 2,
          }
        : undefined,
      availableBalance: row.available_balance_minor_units
        ? {
            minorUnits: BigInt(row.available_balance_minor_units),
            currency: row.currency,
            decimalPlaces: 2,
          }
        : undefined,
      lastBalanceDate: row.last_balance_date,
      lastReconciledAt: row.last_reconciled_at,
      iban: row.iban,
      routingNumber: row.routing_number,
      bic: row.bic,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      metadata: row.metadata || {},
      provenance: row.provenance || {},
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPatternRow(row: any): FlowPattern {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      severity: row.severity,
      confidence: parseFloat(row.confidence),
      periodStart: row.period_start,
      periodEnd: row.period_end,
      primaryPartyIds: row.primary_party_ids || [],
      involvedPartyIds: row.involved_party_ids || [],
      involvedAccountIds: row.involved_account_ids || [],
      transactionIds: row.transaction_ids || [],
      totalValue: row.total_value || createMonetaryAmount(0, 'USD'),
      transactionCount: row.transaction_count || 0,
      timeSpanHours: row.time_span_hours,
      detectionRule: row.detection_rule,
      ruleParameters: row.rule_parameters || {},
      thresholds: row.thresholds || {},
      flowGraph: row.flow_graph,
      reviewStatus: row.review_status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      metadata: row.metadata || {},
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const queryService = new QueryService();

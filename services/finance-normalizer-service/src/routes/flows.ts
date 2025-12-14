import { Router, type Response, type NextFunction } from 'express';
import type { TenantRequest } from '../middleware/tenant.js';
import { queryService } from '../services/QueryService.js';
import { flowDetectionService } from '../services/FlowDetectionService.js';
import { flowQuerySchema } from '@intelgraph/finance-normalizer-types';
import { ValidationError } from '../middleware/errorHandler.js';

export const flowRoutes = Router();

/**
 * POST /api/v1/flows/query
 * Query flows between entities
 */
flowRoutes.post(
  '/query',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const query = flowQuerySchema.parse(req.body);

      const result = await queryService.queryFlows(query, req.tenantId);

      // Serialize BigInt values in results
      const serializedResults = Array.isArray(result.results)
        ? result.results.map(serializeFlowItem)
        : result.results;

      res.json({
        ...result,
        results: serializedResults,
        summary: result.summary
          ? {
              ...result.summary,
              totalGrossFlow: serializeMonetaryAmount(result.summary.totalGrossFlow),
              totalNetFlow: serializeMonetaryAmount(result.summary.totalNetFlow),
              averageTransactionSize: result.summary.averageTransactionSize
                ? serializeMonetaryAmount(result.summary.averageTransactionSize)
                : undefined,
            }
          : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/flows/between
 * Shorthand for querying flows between two entities
 */
flowRoutes.get(
  '/between',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { from, to, startDate, endDate, aggregation } = req.query;

      if (!from || !to || !startDate || !endDate) {
        throw new ValidationError('Missing required parameters: from, to, startDate, endDate');
      }

      const query = flowQuerySchema.parse({
        entityIds: [from as string],
        entityType: 'PARTY',
        counterpartyIds: [to as string],
        periodStart: startDate as string,
        periodEnd: endDate as string,
        aggregation: (aggregation as string) || 'NONE',
        limit: 1000,
        offset: 0,
        sortBy: 'DATE',
        sortOrder: 'ASC',
      });

      const result = await queryService.queryFlows(query, req.tenantId);

      res.json({
        from,
        to,
        periodStart: startDate,
        periodEnd: endDate,
        results: Array.isArray(result.results)
          ? result.results.map(serializeFlowItem)
          : result.results,
        summary: result.summary
          ? {
              ...result.summary,
              totalGrossFlow: serializeMonetaryAmount(result.summary.totalGrossFlow),
              totalNetFlow: serializeMonetaryAmount(result.summary.totalNetFlow),
            }
          : undefined,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/flows/patterns
 * Get detected flow patterns
 */
flowRoutes.get(
  '/patterns',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const filters: Parameters<typeof queryService.getPatterns>[1] = {};

      if (req.query.type) {
        filters.type = req.query.type as string;
      }
      if (req.query.severity) {
        filters.severity = req.query.severity as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.startDate) {
        filters.startDate = req.query.startDate as string;
      }
      if (req.query.endDate) {
        filters.endDate = req.query.endDate as string;
      }
      if (req.query.partyId) {
        filters.partyId = req.query.partyId as string;
      }

      const result = await queryService.getPatterns(
        req.tenantId,
        filters,
        limit,
        offset
      );

      res.json({
        patterns: result.patterns.map(serializePattern),
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.patterns.length < result.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/flows/analyze
 * Analyze transactions for patterns (ad-hoc)
 */
flowRoutes.post(
  '/analyze',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { transactionIds, config } = req.body;

      if (!transactionIds || !Array.isArray(transactionIds)) {
        throw new ValidationError('transactionIds must be an array');
      }

      // Fetch transactions
      const transactions = [];
      for (const id of transactionIds) {
        const txn = await queryService.getTransaction(id, req.tenantId);
        if (txn) {
          transactions.push(txn);
        }
      }

      // Analyze for patterns
      const patterns = await flowDetectionService.analyzeTransactions(
        transactions,
        req.tenantId
      );

      res.json({
        analyzedTransactions: transactions.length,
        patternsDetected: patterns.length,
        patterns: patterns.map(serializePattern),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/flows/aggregate
 * Build aggregated flows
 */
flowRoutes.post(
  '/aggregate',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { transactionIds, granularity = 'DAILY' } = req.body;

      if (!transactionIds || !Array.isArray(transactionIds)) {
        throw new ValidationError('transactionIds must be an array');
      }

      // Fetch transactions
      const transactions = [];
      for (const id of transactionIds) {
        const txn = await queryService.getTransaction(id, req.tenantId);
        if (txn) {
          transactions.push(txn);
        }
      }

      // Build aggregated flows
      const flows = await flowDetectionService.buildAggregatedFlows(
        transactions,
        granularity,
        req.tenantId
      );

      res.json({
        sourceTransactions: transactions.length,
        aggregatedFlows: flows.length,
        granularity,
        flows: flows.map(serializeAggregatedFlow),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Serialization helpers

function serializeFlowItem(item: any): any {
  if (item.amount) {
    // It's a transaction
    return serializeTransaction(item);
  }
  // It's an aggregated flow
  return serializeAggregatedFlow(item);
}

function serializeTransaction(txn: any): any {
  return {
    ...txn,
    amount: txn.amount ? serializeMonetaryAmount(txn.amount) : undefined,
    settlementAmount: txn.settlementAmount
      ? serializeMonetaryAmount(txn.settlementAmount)
      : undefined,
    totalFees: txn.totalFees ? serializeMonetaryAmount(txn.totalFees) : undefined,
    runningBalance: txn.runningBalance
      ? serializeMonetaryAmount(txn.runningBalance)
      : undefined,
  };
}

function serializeAggregatedFlow(flow: any): any {
  return {
    ...flow,
    grossFlow: serializeMonetaryAmount(flow.grossFlow),
    netFlow: serializeMonetaryAmount(flow.netFlow),
    maxTransaction: flow.maxTransaction
      ? serializeMonetaryAmount(flow.maxTransaction)
      : undefined,
    minTransaction: flow.minTransaction
      ? serializeMonetaryAmount(flow.minTransaction)
      : undefined,
    averageTransactionSize: flow.averageTransactionSize
      ? serializeMonetaryAmount(flow.averageTransactionSize)
      : undefined,
    byTransactionType: flow.byTransactionType?.map((t: any) => ({
      ...t,
      totalAmount: serializeMonetaryAmount(t.totalAmount),
    })),
  };
}

function serializePattern(pattern: any): any {
  return {
    ...pattern,
    totalValue: serializeMonetaryAmount(pattern.totalValue),
    averageTransactionValue: pattern.averageTransactionValue
      ? serializeMonetaryAmount(pattern.averageTransactionValue)
      : undefined,
  };
}

function serializeMonetaryAmount(amount: any): any {
  if (!amount) return undefined;
  const divisor = Math.pow(10, amount.decimalPlaces || 2);
  const value = Number(amount.minorUnits) / divisor;
  return {
    ...amount,
    minorUnits: amount.minorUnits.toString(),
    value,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: amount.currency || 'USD',
    }).format(value),
  };
}

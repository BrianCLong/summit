import { Router, type Response, type NextFunction } from 'express';
import type { TenantRequest } from '../middleware/tenant.js';
import { queryService } from '../services/QueryService.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const partyRoutes = Router();

/**
 * GET /api/v1/parties/search
 * Search parties by name
 */
partyRoutes.get(
  '/search',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        res.json({ parties: [], message: 'Query must be at least 2 characters' });
        return;
      }

      const maxLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parties = await queryService.searchParties(req.tenantId, q, maxLimit);

      res.json({
        parties,
        total: parties.length,
        query: q,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/parties/:id
 * Get party by ID
 */
partyRoutes.get(
  '/:id',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const party = await queryService.getParty(req.params.id, req.tenantId);

      if (!party) {
        throw new NotFoundError('Party', req.params.id);
      }

      res.json(party);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/parties/:id/transactions
 * Get transactions for a party
 */
partyRoutes.get(
  '/:id/transactions',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const party = await queryService.getParty(req.params.id, req.tenantId);

      if (!party) {
        throw new NotFoundError('Party', req.params.id);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await queryService.listTransactions(
        req.tenantId,
        { partyId: req.params.id },
        limit,
        offset
      );

      res.json({
        party: {
          id: party.id,
          name: party.canonicalName,
        },
        transactions: result.transactions.map(serializeTransaction),
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.transactions.length < result.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/parties/:id/counterparties
 * Get counterparties for a party (entities they've transacted with)
 */
partyRoutes.get(
  '/:id/counterparties',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const party = await queryService.getParty(req.params.id, req.tenantId);

      if (!party) {
        throw new NotFoundError('Party', req.params.id);
      }

      // Get all transactions for this party
      const result = await queryService.listTransactions(
        req.tenantId,
        { partyId: req.params.id },
        1000,
        0
      );

      // Extract unique counterparty IDs
      const counterpartyIds = new Set<string>();
      for (const txn of result.transactions) {
        if (txn.originatorId && txn.originatorId !== req.params.id) {
          counterpartyIds.add(txn.originatorId);
        }
        if (txn.beneficiaryId && txn.beneficiaryId !== req.params.id) {
          counterpartyIds.add(txn.beneficiaryId);
        }
      }

      // Fetch counterparty details
      const counterparties = [];
      for (const id of counterpartyIds) {
        const cp = await queryService.getParty(id, req.tenantId);
        if (cp) {
          // Count transactions with this counterparty
          const txnCount = result.transactions.filter(
            (t) => t.originatorId === id || t.beneficiaryId === id
          ).length;

          counterparties.push({
            ...cp,
            transactionCount: txnCount,
          });
        }
      }

      // Sort by transaction count
      counterparties.sort((a, b) => b.transactionCount - a.transactionCount);

      res.json({
        party: {
          id: party.id,
          name: party.canonicalName,
        },
        counterparties,
        total: counterparties.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

function serializeTransaction(txn: any): any {
  const formatAmount = (amount: any) => {
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
  };

  return {
    ...txn,
    amount: formatAmount(txn.amount),
    settlementAmount: formatAmount(txn.settlementAmount),
    totalFees: formatAmount(txn.totalFees),
    runningBalance: formatAmount(txn.runningBalance),
  };
}

import { Router, type Response, type NextFunction } from 'express';
import type { TenantRequest } from '../middleware/tenant.js';
import { queryService } from '../services/QueryService.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const transactionRoutes = Router();

/**
 * GET /api/v1/transactions
 * List transactions with filters
 */
transactionRoutes.get(
  '/',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
      const offset = parseInt(req.query.offset as string) || 0;

      const filters: Parameters<typeof queryService.listTransactions>[1] = {};

      if (req.query.accountId) {
        filters.accountId = req.query.accountId as string;
      }
      if (req.query.partyId) {
        filters.partyId = req.query.partyId as string;
      }
      if (req.query.startDate) {
        filters.startDate = req.query.startDate as string;
      }
      if (req.query.endDate) {
        filters.endDate = req.query.endDate as string;
      }
      if (req.query.type) {
        filters.type = req.query.type as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.minAmount) {
        filters.minAmount = parseFloat(req.query.minAmount as string);
      }
      if (req.query.maxAmount) {
        filters.maxAmount = parseFloat(req.query.maxAmount as string);
      }

      const result = await queryService.listTransactions(
        req.tenantId,
        filters,
        limit,
        offset
      );

      // Serialize BigInt values
      const serializedTransactions = result.transactions.map(serializeTransaction);

      res.json({
        transactions: serializedTransactions,
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
 * GET /api/v1/transactions/:id
 * Get transaction by ID
 */
transactionRoutes.get(
  '/:id',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const transaction = await queryService.getTransaction(
        req.params.id,
        req.tenantId
      );

      if (!transaction) {
        throw new NotFoundError('Transaction', req.params.id);
      }

      res.json(serializeTransaction(transaction));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Serialize transaction for JSON response (handle BigInt)
 */
function serializeTransaction(txn: any): any {
  return {
    ...txn,
    amount: txn.amount
      ? {
          ...txn.amount,
          minorUnits: txn.amount.minorUnits.toString(),
          formatted: formatAmount(txn.amount),
        }
      : undefined,
    settlementAmount: txn.settlementAmount
      ? {
          ...txn.settlementAmount,
          minorUnits: txn.settlementAmount.minorUnits.toString(),
          formatted: formatAmount(txn.settlementAmount),
        }
      : undefined,
    totalFees: txn.totalFees
      ? {
          ...txn.totalFees,
          minorUnits: txn.totalFees.minorUnits.toString(),
          formatted: formatAmount(txn.totalFees),
        }
      : undefined,
    runningBalance: txn.runningBalance
      ? {
          ...txn.runningBalance,
          minorUnits: txn.runningBalance.minorUnits.toString(),
          formatted: formatAmount(txn.runningBalance),
        }
      : undefined,
    unitPrice: txn.unitPrice
      ? {
          ...txn.unitPrice,
          minorUnits: txn.unitPrice.minorUnits.toString(),
          formatted: formatAmount(txn.unitPrice),
        }
      : undefined,
    fees: txn.fees?.map((fee: any) => ({
      ...fee,
      amount: fee.amount
        ? {
            ...fee.amount,
            minorUnits: fee.amount.minorUnits.toString(),
            formatted: formatAmount(fee.amount),
          }
        : undefined,
    })),
  };
}

function formatAmount(amount: { minorUnits: bigint; currency: string; decimalPlaces: number }): string {
  const divisor = Math.pow(10, amount.decimalPlaces);
  const value = Number(amount.minorUnits) / divisor;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: amount.currency,
  }).format(value);
}

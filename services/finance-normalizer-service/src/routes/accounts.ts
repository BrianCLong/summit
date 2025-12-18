import { Router, type Response, type NextFunction } from 'express';
import type { TenantRequest } from '../middleware/tenant.js';
import { queryService } from '../services/QueryService.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const accountRoutes = Router();

/**
 * GET /api/v1/accounts
 * List accounts
 */
accountRoutes.get(
  '/',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const filters: Parameters<typeof queryService.listAccounts>[1] = {};

      if (req.query.ownerId) {
        filters.ownerId = req.query.ownerId as string;
      }
      if (req.query.type) {
        filters.type = req.query.type as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.currency) {
        filters.currency = req.query.currency as string;
      }

      const result = await queryService.listAccounts(
        req.tenantId,
        filters,
        limit,
        offset
      );

      res.json({
        accounts: result.accounts.map(serializeAccount),
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.accounts.length < result.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/accounts/:id
 * Get account by ID
 */
accountRoutes.get(
  '/:id',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const account = await queryService.getAccount(req.params.id, req.tenantId);

      if (!account) {
        throw new NotFoundError('Account', req.params.id);
      }

      res.json(serializeAccount(account));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/accounts/:id/transactions
 * Get transactions for an account
 */
accountRoutes.get(
  '/:id/transactions',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const account = await queryService.getAccount(req.params.id, req.tenantId);

      if (!account) {
        throw new NotFoundError('Account', req.params.id);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const filters: Parameters<typeof queryService.listTransactions>[1] = {
        accountId: req.params.id,
      };

      if (req.query.startDate) {
        filters.startDate = req.query.startDate as string;
      }
      if (req.query.endDate) {
        filters.endDate = req.query.endDate as string;
      }
      if (req.query.type) {
        filters.type = req.query.type as string;
      }

      const result = await queryService.listTransactions(
        req.tenantId,
        filters,
        limit,
        offset
      );

      res.json({
        account: {
          id: account.id,
          name: account.name,
          accountNumber: account.accountNumber,
          currency: account.currency,
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
 * GET /api/v1/accounts/:id/balance-history
 * Get balance history for an account
 */
accountRoutes.get(
  '/:id/balance-history',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const account = await queryService.getAccount(req.params.id, req.tenantId);

      if (!account) {
        throw new NotFoundError('Account', req.params.id);
      }

      // Get transactions with running balance
      const result = await queryService.listTransactions(
        req.tenantId,
        {
          accountId: req.params.id,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        },
        1000,
        0
      );

      // Extract balance history points
      const balanceHistory = result.transactions
        .filter((t) => t.runningBalance)
        .map((t) => ({
          date: t.valueDate,
          balance: serializeAmount(t.runningBalance!),
          transactionId: t.id,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({
        account: {
          id: account.id,
          name: account.name,
          currency: account.currency,
        },
        currentBalance: account.balance ? serializeAmount(account.balance) : null,
        balanceHistory,
        dataPoints: balanceHistory.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

function serializeAccount(account: any): any {
  return {
    ...account,
    balance: account.balance ? serializeAmount(account.balance) : undefined,
    availableBalance: account.availableBalance
      ? serializeAmount(account.availableBalance)
      : undefined,
  };
}

function serializeTransaction(txn: any): any {
  return {
    ...txn,
    amount: txn.amount ? serializeAmount(txn.amount) : undefined,
    settlementAmount: txn.settlementAmount
      ? serializeAmount(txn.settlementAmount)
      : undefined,
    runningBalance: txn.runningBalance
      ? serializeAmount(txn.runningBalance)
      : undefined,
  };
}

function serializeAmount(amount: any): any {
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRoutes = void 0;
const express_1 = require("express");
const QueryService_js_1 = require("../services/QueryService.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.accountRoutes = (0, express_1.Router)();
/**
 * GET /api/v1/accounts
 * List accounts
 */
exports.accountRoutes.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const offset = parseInt(req.query.offset) || 0;
        const filters = {};
        if (req.query.ownerId) {
            filters.ownerId = req.query.ownerId;
        }
        if (req.query.type) {
            filters.type = req.query.type;
        }
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.currency) {
            filters.currency = req.query.currency;
        }
        const result = await QueryService_js_1.queryService.listAccounts(req.tenantId, filters, limit, offset);
        res.json({
            accounts: result.accounts.map(serializeAccount),
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.accounts.length < result.total,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/accounts/:id
 * Get account by ID
 */
exports.accountRoutes.get('/:id', async (req, res, next) => {
    try {
        const account = await QueryService_js_1.queryService.getAccount(req.params.id, req.tenantId);
        if (!account) {
            throw new errorHandler_js_1.NotFoundError('Account', req.params.id);
        }
        res.json(serializeAccount(account));
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/accounts/:id/transactions
 * Get transactions for an account
 */
exports.accountRoutes.get('/:id/transactions', async (req, res, next) => {
    try {
        const account = await QueryService_js_1.queryService.getAccount(req.params.id, req.tenantId);
        if (!account) {
            throw new errorHandler_js_1.NotFoundError('Account', req.params.id);
        }
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const offset = parseInt(req.query.offset) || 0;
        const filters = {
            accountId: req.params.id,
        };
        if (req.query.startDate) {
            filters.startDate = req.query.startDate;
        }
        if (req.query.endDate) {
            filters.endDate = req.query.endDate;
        }
        if (req.query.type) {
            filters.type = req.query.type;
        }
        const result = await QueryService_js_1.queryService.listTransactions(req.tenantId, filters, limit, offset);
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/accounts/:id/balance-history
 * Get balance history for an account
 */
exports.accountRoutes.get('/:id/balance-history', async (req, res, next) => {
    try {
        const account = await QueryService_js_1.queryService.getAccount(req.params.id, req.tenantId);
        if (!account) {
            throw new errorHandler_js_1.NotFoundError('Account', req.params.id);
        }
        // Get transactions with running balance
        const result = await QueryService_js_1.queryService.listTransactions(req.tenantId, {
            accountId: req.params.id,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        }, 1000, 0);
        // Extract balance history points
        const balanceHistory = result.transactions
            .filter((t) => t.runningBalance)
            .map((t) => ({
            date: t.valueDate,
            balance: serializeAmount(t.runningBalance),
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
    }
    catch (error) {
        next(error);
    }
});
function serializeAccount(account) {
    return {
        ...account,
        balance: account.balance ? serializeAmount(account.balance) : undefined,
        availableBalance: account.availableBalance
            ? serializeAmount(account.availableBalance)
            : undefined,
    };
}
function serializeTransaction(txn) {
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
function serializeAmount(amount) {
    if (!amount)
        return undefined;
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

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const approvalsStore = [];
const getPostgresPoolMock = globals_1.jest.fn();
const approvalsPendingIncMock = globals_1.jest.fn();
const approvalsPendingDecMock = globals_1.jest.fn();
const approvalsApprovedIncMock = globals_1.jest.fn();
const approvalsRejectedIncMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
globals_1.jest.unstable_mockModule('../../monitoring/metrics.js', () => ({
    approvalsPending: {
        inc: approvalsPendingIncMock,
        dec: approvalsPendingDecMock,
    },
    approvalsApprovedTotal: {
        inc: approvalsApprovedIncMock,
    },
    approvalsRejectedTotal: {
        inc: approvalsRejectedIncMock,
    },
}));
(0, globals_1.describe)('Approvals service', () => {
    let createApproval;
    let listApprovals;
    let approveApproval;
    let rejectApproval;
    let pendingCount = 0;
    let approvedTotal = 0;
    let rejectedTotal = 0;
    (0, globals_1.beforeAll)(async () => {
        ({
            approveApproval,
            createApproval,
            listApprovals,
            rejectApproval,
        } = await Promise.resolve().then(() => __importStar(require('../approvals.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        approvalsStore.splice(0, approvalsStore.length);
        pendingCount = 0;
        approvedTotal = 0;
        rejectedTotal = 0;
        globals_1.jest.clearAllMocks();
        approvalsPendingIncMock.mockImplementation(() => {
            pendingCount += 1;
        });
        approvalsPendingDecMock.mockImplementation(() => {
            pendingCount -= 1;
        });
        approvalsApprovedIncMock.mockImplementation(() => {
            approvedTotal += 1;
        });
        approvalsRejectedIncMock.mockImplementation(() => {
            rejectedTotal += 1;
        });
        const buildResponse = (rows) => ({ rows });
        const query = globals_1.jest.fn(async (text, params = []) => {
            if (text.startsWith('INSERT INTO approvals')) {
                const approval = {
                    id: `app-${approvalsStore.length + 1}`,
                    requester_id: params[0],
                    status: params[1],
                    action: params[2],
                    payload: JSON.parse(params[3] || '{}'),
                    reason: params[4],
                    run_id: params[5],
                    created_at: new Date(),
                    updated_at: new Date(),
                    approver_id: null,
                    decision_reason: null,
                    resolved_at: null,
                };
                approvalsStore.push(approval);
                return buildResponse([approval]);
            }
            if (text.startsWith('SELECT * FROM approvals WHERE id =')) {
                const found = approvalsStore.filter((item) => item.id === params[0]);
                return buildResponse(found);
            }
            if (text.startsWith('SELECT * FROM approvals')) {
                const filtered = text.includes('status = $1')
                    ? approvalsStore.filter((item) => item.status === params[0])
                    : approvalsStore;
                return buildResponse(filtered.sort((a, b) => +b.created_at - +a.created_at));
            }
            if (text.includes("SET status = 'approved'")) {
                const approval = approvalsStore.find((item) => item.id === params[0] && item.status === 'pending');
                if (!approval)
                    return buildResponse([]);
                approval.status = 'approved';
                approval.approver_id = params[1];
                approval.decision_reason = params[2];
                approval.resolved_at = new Date();
                approval.updated_at = approval.resolved_at;
                return buildResponse([approval]);
            }
            if (text.includes("SET status = 'rejected'")) {
                const approval = approvalsStore.find((item) => item.id === params[0] && item.status === 'pending');
                if (!approval)
                    return buildResponse([]);
                approval.status = 'rejected';
                approval.approver_id = params[1];
                approval.decision_reason = params[2];
                approval.resolved_at = new Date();
                approval.updated_at = approval.resolved_at;
                return buildResponse([approval]);
            }
            return buildResponse([]);
        });
        getPostgresPoolMock.mockReturnValue({ query });
    });
    (0, globals_1.it)('creates and lists pending approvals', async () => {
        const created = await createApproval({
            requesterId: 'user-1',
            action: 'maestro_run',
            payload: { requestText: 'do something risky' },
            reason: 'external side effects',
        });
        (0, globals_1.expect)(created.status).toBe('pending');
        (0, globals_1.expect)(pendingCount).toBe(1);
        const pending = await listApprovals({ status: 'pending' });
        (0, globals_1.expect)(pending).toHaveLength(1);
        (0, globals_1.expect)(pending[0].requester_id).toBe('user-1');
    });
    (0, globals_1.it)('approves a pending request and updates metrics', async () => {
        const approval = await createApproval({ requesterId: 'user-2' });
        const approved = await approveApproval(approval.id, 'approver-1', 'looks safe');
        (0, globals_1.expect)(approved?.status).toBe('approved');
        (0, globals_1.expect)(approved?.approver_id).toBe('approver-1');
        (0, globals_1.expect)(pendingCount).toBe(0);
        (0, globals_1.expect)(approvedTotal).toBe(1);
    });
    (0, globals_1.it)('rejects a pending request and prevents double decisions', async () => {
        const approval = await createApproval({ requesterId: 'user-3' });
        const rejected = await rejectApproval(approval.id, 'approver-2', 'too risky');
        (0, globals_1.expect)(rejected?.status).toBe('rejected');
        (0, globals_1.expect)(rejectedTotal).toBe(1);
        const secondDecision = await approveApproval(approval.id, 'approver-3');
        (0, globals_1.expect)(secondDecision).toBeNull();
    });
});

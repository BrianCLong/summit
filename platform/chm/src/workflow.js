"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DowngradeWorkflow = void 0;
class DowngradeWorkflow {
    bus;
    taxonomy;
    ruleEngine;
    downgradeRequests = new Map();
    constructor(bus, taxonomy, ruleEngine) {
        this.bus = bus;
        this.taxonomy = taxonomy;
        this.ruleEngine = ruleEngine;
    }
    requestDowngrade(payload) {
        if (payload.requiredApprovals < 2) {
            throw new Error('Dual control requires at least two approvals');
        }
        const request = {
            ...payload,
            approvers: new Set(),
            status: 'pending'
        };
        this.downgradeRequests.set(request.id, request);
        return request;
    }
    approveDowngrade(id, approver) {
        const request = this.downgradeRequests.get(id);
        if (!request) {
            throw new Error(`Downgrade request ${id} not found`);
        }
        if (request.status !== 'pending') {
            return request;
        }
        request.approvers.add(approver);
        if (request.approvers.size >= request.requiredApprovals) {
            request.status = 'approved';
        }
        return request;
    }
    finalizeDowngrade(requestId, tag) {
        const request = this.downgradeRequests.get(requestId);
        if (!request)
            throw new Error(`Downgrade request ${requestId} not found`);
        if (request.status !== 'approved') {
            throw new Error('Downgrade requires dual control approvals');
        }
        return this.taxonomy.downgradeTag(tag, request.targetLevel, Array.from(request.approvers));
    }
    handleExport(exportRequest) {
        const { tag, context } = exportRequest;
        const decision = this.ruleEngine.evaluate(tag, context);
        exportRequest.decision = decision;
        return exportRequest;
    }
}
exports.DowngradeWorkflow = DowngradeWorkflow;

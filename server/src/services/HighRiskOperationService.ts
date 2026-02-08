import { randomUUID } from 'crypto';
import pino from 'pino';
import { provenanceLedger } from '../provenance/ledger.js';
import { TrustIntelligenceService } from './TrustIntelligenceService.js';

const logger = (pino as any)({ name: 'HighRiskOperationService' });

export enum HighRiskOpStatus {
    REQUESTED = 'REQUESTED',
    APPROVED = 'APPROVED',
    EXECUTED = 'EXECUTED',
    REVERTED = 'REVERTED',
    DENIED = 'DENIED',
    EXPIRED = 'EXPIRED'
}

export interface HighRiskOperationRequest {
    id: string;
    tenantId: string;
    actorId: string;
    operationType: string;
    parameters: Record<string, any>;
    status: HighRiskOpStatus;
    requestedAt: Date;
    expiresAt: Date;
    approvals: Array<{
        userId: string;
        role: string;
        timestamp: Date;
        signature?: string;
    }>;
    replayManifest?: any;
}

export class HighRiskOperationService {
    private requests: Map<string, HighRiskOperationRequest> = new Map();
    private trustService: TrustIntelligenceService;

    constructor() {
        this.trustService = new TrustIntelligenceService();
    }

    async createRequest(params: {
        tenantId: string;
        actorId: string;
        operationType: string;
        parameters: Record<string, any>;
    }): Promise<HighRiskOperationRequest> {
        const { tenantId, actorId, operationType, parameters } = params;

        // 1. Policy Preflight
        logger.info({ tenantId, actorId, operationType }, 'Evaluating high-risk operation preflight');
        const manifest = await this.trustService.generateReplayManifest(params);

        // Check if the operation is generally allowable (even without approvals) for preflight
        // In a real system, preflight might check if the USER is even allowed to ask.
        const isDeterministic = await this.trustService.verifyDeterminism(manifest);
        if (!isDeterministic) {
            throw new Error('Trust Intelligence Failure: Operation generation is non-deterministic');
        }

        const request: HighRiskOperationRequest = {
            id: `hro_${randomUUID()}`,
            tenantId,
            actorId,
            operationType,
            parameters,
            status: HighRiskOpStatus.REQUESTED,
            requestedAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // Default 2h
            approvals: [],
            replayManifest: manifest
        };

        this.requests.set(request.id, request);

        // Record to Provenance Ledger
        await provenanceLedger.appendEntry({
            tenantId,
            actionType: 'HRO_REQUEST_CREATED',
            resourceType: 'HighRiskOperationRequest',
            resourceId: request.id,
            actorId,
            actorType: 'user',
            payload: { request },
            metadata: {
                operationType,
                manifestHash: manifest.hash
            }
        });

        return request;
    }

    async approveRequest(requestId: string, userId: string, role: string): Promise<HighRiskOperationRequest> {
        const request = this.requests.get(requestId);
        if (!request) throw new Error('Request not found');

        request.approvals.push({
            userId,
            role,
            timestamp: new Date()
        });

        // 2. Satisfiability Check during approval
        const isSatisfiable = await this.trustService.verifySatisfiability(request.replayManifest, request.approvals);
        if (isSatisfiable) {
            request.status = HighRiskOpStatus.APPROVED;
        }

        await provenanceLedger.appendEntry({
            tenantId: request.tenantId,
            actionType: 'HRO_REQUEST_APPROVED',
            resourceType: 'HighRiskOperationRequest',
            resourceId: request.id,
            actorId: userId,
            actorType: 'user',
            payload: { approval: { userId, role } },
            metadata: {
                currentStatus: request.status,
                approvalCount: request.approvals.length,
                isSatisfiable
            }
        });

        return request;
    }

    async executeOperation(requestId: string): Promise<void> {
        const request = this.requests.get(requestId);
        if (!request) throw new Error('Request not found');

        // 3. Final Satisfiability Check before execution
        const isSatisfiable = await this.trustService.verifySatisfiability(request.replayManifest, request.approvals);
        if (!isSatisfiable) {
            request.status = HighRiskOpStatus.DENIED;
            throw new Error('Trust Intelligence Failure: Operation does not satisfy governance constraints');
        }

        if (request.status !== HighRiskOpStatus.APPROVED && request.status !== HighRiskOpStatus.REQUESTED) {
            // Note: REQUESTED might be okay if policy allows single-actor for some things, 
            // but here we expect APPROVED via dual-control.
            if (request.status !== HighRiskOpStatus.APPROVED) {
                throw new Error(`Execution denied: current status is ${request.status}`);
            }
        }

        request.status = HighRiskOpStatus.EXECUTED;

        logger.info({ requestId, type: request.operationType }, 'Executing high-risk operation');

        // Simulate execution...

        await provenanceLedger.appendEntry({
            tenantId: request.tenantId,
            actionType: 'HRO_EXECUTED',
            resourceType: 'HighRiskOperationRequest',
            resourceId: request.id,
            actorId: 'system',
            actorType: 'system',
            payload: { execution: true },
            metadata: {
                operationType: request.operationType,
                executionTime: new Date()
            }
        });
    }
}

export const highRiskOperationService = new HighRiskOperationService();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runService = exports.RunService = void 0;
const uuid_1 = require("uuid");
const neo4j_js_1 = require("../graph/neo4j.js");
const ReceiptService_js_1 = require("./provenance/ReceiptService.js");
const metering_service_js_1 = require("./metering-service.js");
class RunService {
    static instance;
    queryRunner;
    receiptService;
    meteringService;
    constructor(queryRunner, receiptService, meteringService) {
        this.queryRunner = queryRunner;
        this.receiptService = receiptService;
        this.meteringService = meteringService;
    }
    static getInstance(queryRunner = neo4j_js_1.runCypher, receiptService = ReceiptService_js_1.receiptService, meteringService = metering_service_js_1.meteringService) {
        if (!RunService.instance) {
            RunService.instance = new RunService(queryRunner, receiptService, meteringService);
        }
        return RunService.instance;
    }
    static resetInstance(queryRunner = neo4j_js_1.runCypher, receiptService = ReceiptService_js_1.receiptService, meteringService = metering_service_js_1.meteringService) {
        RunService.instance = new RunService(queryRunner, receiptService, meteringService);
    }
    async createRun(tenantId, workflowId, inputPayload, principalId, env) {
        const runId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const policyDecisionId = (0, uuid_1.v4)();
        await this.recordPolicyDecision(tenantId, policyDecisionId, 'ALLOW', { action: 'start_run', resource: workflowId });
        const receipt = this.receiptService.generateReceipt(tenantId, 'run.start', principalId, runId, JSON.parse(inputPayload), policyDecisionId);
        const query = `
      MATCH (w:WorkflowDefinition {id: $workflowId})
      CREATE (r:Run:Entity {
        id: $runId,
        tenantId: $tenantId,
        status: 'PENDING',
        startedAt: $now,
        input: $input,
        env: $env,
        createdAt: $now,
        updatedAt: $now,
        owner: $principalId,
        name: 'Run ' + $runId,
        description: 'Execution of ' + w.name
      })
      CREATE (r)-[:DEFINED_BY]->(w)
      CREATE (rcpt:Receipt:BaseNode {
        id: $receiptId,
        digest: $digest,
        signature: $signature,
        kid: $kid,
        createdAt: $now,
        updatedAt: $now,
        owner: $principalId
      })
      CREATE (r)-[:LOGGED_IN]->(rcpt)
      CREATE (pd:PolicyDecision:BaseNode {
        id: $policyDecisionId,
        outcome: 'ALLOW',
        policyVersion: 'v1',
        inputHash: 'simulated_hash',
        evaluationLog: '{}',
        createdAt: $now,
        updatedAt: $now,
        owner: 'system'
      })
      CREATE (r)-[:SUBJECT_TO]->(pd)
      RETURN r
    `;
        const params = {
            workflowId,
            runId,
            tenantId,
            input: inputPayload,
            env,
            now,
            receiptId: receipt.id,
            digest: receipt.digest,
            signature: receipt.signature,
            kid: receipt.kid,
            policyDecisionId
        };
        const result = await this.queryRunner(query, params, { tenantId, write: true });
        try {
            await this.meteringService.trackRunUsage(tenantId, runId, 1);
        }
        catch (e) {
            console.warn('Metering failed but ignoring for now:', e);
        }
        const record = result[0];
        const runNode = record && record.r ? record.r.properties : { id: runId, status: 'PENDING', ...record?.r };
        return {
            ...runNode,
            workflowId,
            receipts: [receipt]
        };
    }
    async recordPolicyDecision(tenantId, id, outcome, details) {
        // Helper
    }
}
exports.RunService = RunService;
exports.runService = RunService.getInstance();

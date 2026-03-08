"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.WorkflowService = void 0;
const uuid_1 = require("uuid");
const neo4j_js_1 = require("../graph/neo4j.js");
class WorkflowService {
    static instance;
    queryRunner;
    constructor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    static getInstance(queryRunner = neo4j_js_1.runCypher) {
        if (!WorkflowService.instance) {
            WorkflowService.instance = new WorkflowService(queryRunner);
        }
        return WorkflowService.instance;
    }
    // Allow resetting for tests
    static resetInstance(queryRunner = neo4j_js_1.runCypher) {
        WorkflowService.instance = new WorkflowService(queryRunner);
    }
    async createDefinition(tenantId, input) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const query = `
      CREATE (w:WorkflowDefinition:Entity {
        id: $id,
        tenantId: $tenantId,
        version: $version,
        env: $env,
        retentionClass: $retentionClass,
        costCenter: $costCenter,
        inputSchema: $inputSchema,
        outputSchema: $outputSchema,
        body: $body,
        createdAt: $now,
        updatedAt: $now,
        owner: $tenantId,
        name: 'Workflow ' + $version,
        description: 'Workflow Definition'
      })
      RETURN w
    `;
        const params = {
            id,
            tenantId,
            version: input.version,
            env: input.env,
            retentionClass: input.retentionClass,
            costCenter: input.costCenter,
            inputSchema: input.inputSchema,
            outputSchema: input.outputSchema || '',
            body: input.body,
            now
        };
        const result = await this.queryRunner(query, params, { tenantId, write: true });
        const record = result[0];
        return record && record.w ? record.w.properties : { id, ...input, tenantId, createdAt: now, updatedAt: now };
    }
    async getDefinition(tenantId, id) {
        const query = `
      MATCH (w:WorkflowDefinition {id: $id, tenantId: $tenantId})
      RETURN w
    `;
        const result = await this.queryRunner(query, { id, tenantId });
        if (result.length === 0)
            return null;
        const record = result[0];
        return record.w ? record.w.properties : record;
    }
}
exports.WorkflowService = WorkflowService;
exports.workflowService = WorkflowService.getInstance();

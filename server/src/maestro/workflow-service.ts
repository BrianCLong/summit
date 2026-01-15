
import { v4 as uuidv4 } from 'uuid';
import { runCypher as defaultRunCypher } from '../graph/neo4j.js';
import { WorkflowDefinition, WorkflowDefinitionInput } from './api-types.js';

type QueryRunner = (query: string, params: any, options?: any) => Promise<any[]>;

export class WorkflowService {
  private static instance: WorkflowService;
  private queryRunner: QueryRunner;

  private constructor(queryRunner: QueryRunner) {
    this.queryRunner = queryRunner;
  }

  static getInstance(queryRunner: QueryRunner = defaultRunCypher): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService(queryRunner);
    }
    return WorkflowService.instance;
  }

  // Allow resetting for tests
  static resetInstance(queryRunner: QueryRunner = defaultRunCypher) {
    WorkflowService.instance = new WorkflowService(queryRunner);
  }

  async createDefinition(tenantId: string, input: WorkflowDefinitionInput): Promise<WorkflowDefinition> {
    const id = uuidv4();
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
    const record = result[0] as any;

    return record && record.w ? record.w.properties : { id, ...input, tenantId, createdAt: now, updatedAt: now };
  }

  async getDefinition(tenantId: string, id: string): Promise<WorkflowDefinition | null> {
    const query = `
      MATCH (w:WorkflowDefinition {id: $id, tenantId: $tenantId})
      RETURN w
    `;
    const result = await this.queryRunner(query, { id, tenantId });
    if (result.length === 0) return null;

    const record = result[0] as any;
    return record.w ? record.w.properties : record;
  }
}

export const workflowService = WorkflowService.getInstance();

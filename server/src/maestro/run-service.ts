
import { v4 as uuidv4 } from 'uuid';
import { runCypher as defaultRunCypher } from '../graph/neo4j.js';
import { receiptService as defaultReceiptService, ReceiptService } from './provenance/ReceiptService.js';
import { meteringService as defaultMeteringService, MeteringService } from './metering-service.js';
import { Run, Receipt } from './api-types.js';

type QueryRunner = (query: string, params: any, options?: any) => Promise<any[]>;

export class RunService {
  private static instance: RunService;
  private queryRunner: QueryRunner;
  private receiptService: ReceiptService;
  private meteringService: MeteringService;

  private constructor(
    queryRunner: QueryRunner,
    receiptService: ReceiptService,
    meteringService: MeteringService
  ) {
    this.queryRunner = queryRunner;
    this.receiptService = receiptService;
    this.meteringService = meteringService;
  }

  static getInstance(
    queryRunner: QueryRunner = defaultRunCypher,
    receiptService: ReceiptService = defaultReceiptService,
    meteringService: MeteringService = defaultMeteringService
  ): RunService {
    if (!RunService.instance) {
      RunService.instance = new RunService(queryRunner, receiptService, meteringService);
    }
    return RunService.instance;
  }

  static resetInstance(
    queryRunner: QueryRunner = defaultRunCypher,
    receiptService: ReceiptService = defaultReceiptService,
    meteringService: MeteringService = defaultMeteringService
  ) {
    RunService.instance = new RunService(queryRunner, receiptService, meteringService);
  }

  async createRun(
    tenantId: string,
    workflowId: string,
    inputPayload: string,
    principalId: string,
    env: string
  ): Promise<Run> {
    const runId = uuidv4();
    const now = new Date().toISOString();

    const policyDecisionId = uuidv4();
    await this.recordPolicyDecision(tenantId, policyDecisionId, 'ALLOW', { action: 'start_run', resource: workflowId });

    const receipt = this.receiptService.generateReceipt(
      tenantId,
      'run.start',
      principalId,
      runId,
      JSON.parse(inputPayload),
      policyDecisionId
    );

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
    } catch (e) {
      console.warn('Metering failed but ignoring for now:', e);
    }

    const record = result[0] as any;
    const runNode = record && record.r ? record.r.properties : { id: runId, status: 'PENDING', ...record?.r };

    return {
      ...runNode,
      workflowId,
      receipts: [receipt]
    };
  }

  async recordPolicyDecision(tenantId: string, id: string, outcome: string, details: any) {
    // Helper
  }
}

export const runService = RunService.getInstance();

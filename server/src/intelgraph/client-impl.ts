import { getNeo4jDriver } from '../config/database.js';
import { IntelGraphClient } from './client.js';
import {
  Run,
  Task,
  Artifact,
  CostSample,
  RunCostSummary,
} from '../maestro/types.js';

export class IntelGraphClientImpl implements IntelGraphClient {
  private get driver() {
    return getNeo4jDriver();
  }

  async createRun(run: Run): Promise<void> {
    const session = this.driver.session();
    try {
      const { user, ...props } = run;
      await session.run(
        `
        MERGE (r:MaestroRun {id: $props.id})
        SET r += $props
        SET r.userId = $userId
        WITH r
        MERGE (u:User {id: $userId})
        MERGE (r)-[:REQUESTED_BY]->(u)
        `,
        { props, userId: user?.id || 'anonymous' }
      );
    } finally {
      await session.close();
    }
  }

  async updateRun(runId: string, patch: Partial<Run>): Promise<void> {
    const session = this.driver.session();
    try {
      // Exclude nested objects from patch if any (like user)
      const { user, ...props } = patch;
      await session.run(
        `
        MATCH (r:MaestroRun {id: $runId})
        SET r += $props
        `,
        { runId, props }
      );
    } finally {
      await session.close();
    }
  }

  async createTask(task: Task): Promise<void> {
    const session = this.driver.session();
    try {
      const { agent, ...props } = task;
      await session.run(
        `
        MATCH (r:MaestroRun {id: $props.runId})
        MERGE (t:MaestroTask {id: $props.id})
        SET t += $props
        SET t.agentId = $agentId, t.agentName = $agentName, t.agentKind = $agentKind
        MERGE (r)-[:HAS_TASK]->(t)
        `,
        {
          props,
          agentId: agent?.id,
          agentName: agent?.name,
          agentKind: agent?.kind
        }
      );
    } finally {
      await session.close();
    }
  }

  async updateTask(taskId: string, patch: Partial<Task>): Promise<void> {
    const session = this.driver.session();
    try {
      const { agent, ...props } = patch;
      await session.run(
        `
        MATCH (t:MaestroTask {id: $taskId})
        SET t += $props
        `,
        { taskId, props }
      );
    } finally {
      await session.close();
    }
  }

  async createArtifact(artifact: Artifact): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (t:MaestroTask {id: $artifact.taskId})
        MERGE (a:MaestroArtifact {id: $artifact.id})
        SET a += $artifact
        MERGE (t)-[:HAS_ARTIFACT]->(a)
        MERGE (r:MaestroRun {id: $artifact.runId})
        MERGE (r)-[:HAS_ARTIFACT]->(a)
        `,
        { artifact }
      );
    } finally {
      await session.close();
    }
  }

  async recordCostSample(sample: CostSample): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (r:MaestroRun {id: $sample.runId})
        CREATE (c:MaestroCostSample)
        SET c += $sample
        MERGE (r)-[:HAS_COST]->(c)
        `,
        { sample }
      );
    } finally {
      await session.close();
    }
  }

  async getRunCostSummary(runId: string): Promise<RunCostSummary> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (r:MaestroRun {id: $runId})-[:HAS_COST]->(c:MaestroCostSample)
        RETURN
          sum(c.costUSD) as totalCostUSD,
          sum(c.inputTokens) as totalInputTokens,
          sum(c.outputTokens) as totalOutputTokens,
          collect({model: c.model, costUSD: c.costUSD, inputTokens: c.inputTokens, outputTokens: c.outputTokens}) as samples
        `,
        { runId }
      );

      if (result.records.length === 0) {
        return {
          runId,
          totalCostUSD: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          byModel: {},
        };
      }

      const record = result.records[0];
      const samples = record.get('samples');
      const byModel: RunCostSummary['byModel'] = {};

      for (const s of samples) {
        if (!byModel[s.model]) {
          byModel[s.model] = { costUSD: 0, inputTokens: 0, outputTokens: 0 };
        }
        byModel[s.model].costUSD += s.costUSD;
        byModel[s.model].inputTokens += s.inputTokens;
        byModel[s.model].outputTokens += s.outputTokens;
      }

      return {
        runId,
        totalCostUSD: record.get('totalCostUSD') || 0,
        totalInputTokens: record.get('totalInputTokens').toNumber(),
        totalOutputTokens: record.get('totalOutputTokens').toNumber(),
        byModel,
      };
    } finally {
      await session.close();
    }
  }

  async getRun(runId: string): Promise<Run | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (r:MaestroRun {id: $runId})
        RETURN r
        `,
        { runId }
      );
      if (result.records.length === 0) return null;
      const props = result.records[0].get('r').properties;
      return {
        ...props,
        user: { id: props.userId },
      } as Run;
    } finally {
      await session.close();
    }
  }

  async getTasksForRun(runId: string): Promise<Task[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (r:MaestroRun {id: $runId})-[:HAS_TASK]->(t:MaestroTask)
        RETURN t
        ORDER BY t.createdAt
        `,
        { runId }
      );
      return result.records.map(r => {
        const props = r.get('t').properties;
        return {
          ...props,
          agent: props.agentId ? { id: props.agentId, name: props.agentName, kind: props.agentKind } : undefined
        } as Task;
      });
    } finally {
      await session.close();
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (t:MaestroTask {id: $taskId})
        RETURN t
        `,
        { taskId }
      );
      if (result.records.length === 0) return null;
      const props = result.records[0].get('t').properties;
      return {
        ...props,
        agent: props.agentId ? { id: props.agentId, name: props.agentName, kind: props.agentKind } : undefined
      } as Task;
    } finally {
      await session.close();
    }
  }

  async getArtifactsForRun(runId: string): Promise<Artifact[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (r:MaestroRun {id: $runId})-[:HAS_ARTIFACT]->(a:MaestroArtifact)
        RETURN a
        ORDER BY a.createdAt
        `,
        { runId }
      );
      return result.records.map(r => r.get('a').properties as Artifact);
    } finally {
      await session.close();
    }
  }

  async getArtifactsForTask(taskId: string): Promise<Artifact[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (t:MaestroTask {id: $taskId})-[:HAS_ARTIFACT]->(a:MaestroArtifact)
        RETURN a
        ORDER BY a.createdAt
        `,
        { taskId }
      );
      return result.records.map(r => r.get('a').properties as Artifact);
    } finally {
      await session.close();
    }
  }
}

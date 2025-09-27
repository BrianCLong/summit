import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import Redis from 'ioredis';

const PYTHON_EXECUTABLE = process.env.GRAPH_ANONYMIZER_PYTHON || process.env.PYTHON_BIN || 'python3';

const resolveAnonymizerScript = (): string => {
  const configuredPath = process.env.GRAPH_ANONYMIZER_PATH;
  const candidates = [
    configuredPath,
    path.resolve(process.cwd(), 'python', 'anonymization', 'anonymize_graph.py'),
    path.resolve(process.cwd(), 'server', 'python', 'anonymization', 'anonymize_graph.py'),
    path.resolve(__dirname, '..', '..', 'python', 'anonymization', 'anonymize_graph.py'),
    path.resolve(__dirname, '..', '..', '..', 'python', 'anonymization', 'anonymize_graph.py'),
    path.resolve(__dirname, '..', '..', '..', 'server', 'python', 'anonymization', 'anonymize_graph.py')
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate graph anonymization script');
};

const parseScriptOutput = (output: string) => {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch (error) {
      continue; // Look for the last JSON object in output
    }
  }

  throw new Error('Anonymization script did not return JSON output');
};

const runAnonymizerScript = (config: any): Promise<any> =>
  new Promise((resolve, reject) => {
    const scriptPath = resolveAnonymizerScript();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-anon-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const child = spawn(PYTHON_EXECUTABLE, [scriptPath, '--config', configPath], {
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const cleanup = () => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    };

    child.on('error', (error) => {
      cleanup();
      reject(error);
    });

    child.on('close', (code) => {
      cleanup();
      if (code !== 0) {
        reject(
          new Error(
            `Anonymization script exited with code ${code}: ${stderr || stdout}`,
          ),
        );
        return;
      }

      try {
        resolve(parseScriptOutput(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';

const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: { 
    async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'tenantCoherence' });
      try {
        const user = getUser(ctx); 
        
        // Enhanced ABAC enforcement with purpose checking
        const policyDecision = await policyEnforcer.requirePurpose('investigation', {
          tenantId,
          userId: user?.id,
          action: 'read' as Action,
          resource: 'coherence_score',
          purpose: ctx.purpose as Purpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get('user-agent')
        });

        if (!policyDecision.allow) {
          throw new Error(`Access denied: ${policyDecision.reason}`);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const cachedResult = await redisClient.get(cacheKey);
          if (cachedResult) {
            console.log(`Cache hit for ${cacheKey}`);
            const parsed = JSON.parse(cachedResult);
            
            // Apply redaction to cached result
            if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
              const redactionPolicy = redactionService.createRedactionPolicy(
                policyDecision.redactionRules as any
              );
              return await redactionService.redactObject(parsed, redactionPolicy, tenantId);
            }
            
            return parsed;
          }
        }

        // Enhanced database query with tenant scoping
        const row = await pg.oneOrNone(
          'SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1', 
          [tenantId], 
          { region: user?.residency }
        );
        
        let result = { 
          tenantId, 
          score: row?.score ?? 0, 
          status: row?.status ?? 'UNKNOWN', 
          updatedAt: row?.updated_at ?? new Date().toISOString() 
        };

        // Apply redaction based on policy decision
        if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
          const redactionPolicy = redactionService.createRedactionPolicy(
            policyDecision.redactionRules as any
          );
          result = await redactionService.redactObject(result, redactionPolicy, tenantId);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const ttl = 60; 
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
          console.log(`Cache set for ${cacheKey} with TTL ${ttl}s`);
        }

        return result;
      } finally {
        end();
      }
    }
  },
  Mutation: {
    async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'publishCoherenceSignal' });
      try {
        const user = getUser(ctx);
        // S4.1 Fine-grained Scopes: Use coherence:write:self if user is publishing for their own tenantId
        const scope = user.tenant === input.tenantId ? 'coherence:write:self' : 'coherence:write';
        // S3.2 Residency Guard: Pass residency to OPA
        opa.enforce(scope, { tenantId: input.tenantId, user, residency: user.residency });

        const { tenantId, type, value, weight, source, ts } = input;
        const signalId = `${source}:${Date.now()}`;
        await neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`, { tenantId, signalId, type, value, weight, source, ts: ts || new Date().toISOString(), provenanceId: 'placeholder' }, { region: user.residency }); // S3.1: Pass region hint

      if (redisClient) {
        const cacheKey = `tenantCoherence:${tenantId}`;
        await redisClient.del(cacheKey);
        console.log(`Cache invalidated for ${cacheKey}`);
      }

        const newSignal = { id: signalId, type, value, weight, source, ts: ts || new Date().toISOString() };
        ctx.pubsub.publish(COHERENCE_EVENTS, { coherenceEvents: newSignal });

        return true;
      } finally {
        end();
      }
    },

    async anonymizeGraphData(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'anonymizeGraphData' });
      try {
        const user = getUser(ctx);
        const requestedPurpose = (ctx?.purpose as Purpose) || 'analytics';
        const tenantId = input?.tenantId || user?.tenant || null;
        const policyTenant = tenantId || user?.tenant || 'system';

        const decision = await policyEnforcer.enforce({
          tenantId: policyTenant,
          userId: user?.id,
          action: 'update',
          resource: 'graph_anonymization',
          purpose: requestedPurpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get?.('user-agent'),
        });

        if (!decision.allow) {
          throw new Error(`Access denied: ${decision.reason || 'policy denied'}`);
        }

        opa.enforce('graph:anonymize', {
          tenantId: policyTenant,
          user,
          residency: user?.residency,
        });

        const config: any = {
          tenant_id: tenantId,
          dry_run: Boolean(input?.dryRun),
          node_properties: (input?.nodeProperties || []).map((node: any) => ({
            label: node.label,
            properties: node.properties || [],
            tenant_property: node.tenantProperty || 'tenant_id',
          })),
          table_columns: (input?.tableColumns || []).map((table: any) => ({
            table: table.table,
            columns: table.columns || [],
            primary_key: table.primaryKey || 'id',
            tenant_column: table.tenantColumn || 'tenant_id',
          })),
        };

        if (process.env.GRAPH_ANONYMIZATION_SALT) {
          config.salt = process.env.GRAPH_ANONYMIZATION_SALT;
        }

        const result: any = await runAnonymizerScript(config);

        const nodeSummary = (result?.node_summary || []).map((entry: any) => ({
          label: entry.label,
          properties: entry.properties || [],
          nodesProcessed: entry.nodes_processed ?? 0,
        }));

        const tableSummary = (result?.table_summary || []).map((entry: any) => ({
          table: entry.table,
          columns: entry.columns || [],
          rowsProcessed: entry.rows_processed ?? 0,
        }));

        return {
          dryRun: result?.dry_run ?? config.dry_run,
          tenantId: result?.tenant_id ?? tenantId,
          nodeSummary,
          tableSummary,
          startedAt: result?.started_at ?? new Date().toISOString(),
          completedAt: result?.completed_at ?? new Date().toISOString(),
        };
      } finally {
        end();
      }
    },
  },
  Subscription: {
    coherenceEvents: {
      subscribe: (_: any, __: any, ctx: any) => {
        const iterator = ctx.pubsub.asyncIterator([COHERENCE_EVENTS]);
        const start = process.hrtime.bigint();
        const wrappedIterator = (async function* () {
          for await (const payload of iterator) {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1_000_000;
            subscriptionFanoutLatency.observe(durationMs);
            yield payload;
          }
        })();
        return wrappedIterator;
      },
    },
  },
};
import {
  FieldNode,
  Kind,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
} from 'graphql';
import neo4j from 'neo4j-driver';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { queryOptimizer } from '../../db/queryOptimizer.js';

interface Translation {
  cypher: string;
  params: Record<string, any>;
  target: string;
  readOnly: boolean;
}

interface DebugError {
  stage: string;
  message: string;
  hint?: string;
}

interface PlanNode {
  operatorType: string;
  identifiers?: string[];
  arguments?: Record<string, unknown>;
  children?: PlanNode[];
}

function collectArgs(field: FieldNode, variables: Record<string, any>): Record<string, any> {
  const args: Record<string, any> = {};
  for (const arg of field.arguments ?? []) {
    args[arg.name.value] = valueFromASTUntyped(arg.value, variables);
  }
  return args;
}

function buildGraphDataTranslation(args: Record<string, any>): Translation {
  const investigationId = args.investigationId;
  if (!investigationId) {
    throw new Error('graphData requires an investigationId argument.');
  }

  const filter = args.filter ?? {};
  const params: Record<string, any> = {
    investigationId,
    minConfidence: filter.minConfidence ?? null,
    tags: filter.tags ?? null,
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
  };

  const cypher = `
MATCH (e:Entity { investigationId: $investigationId })
WHERE ($minConfidence IS NULL OR e.confidence >= $minConfidence)
  AND ($startDate IS NULL OR e.createdAt >= $startDate)
  AND ($endDate IS NULL OR e.createdAt <= $endDate)
  AND ($tags IS NULL OR size($tags) = 0 OR any(tag IN $tags WHERE tag IN coalesce(e.tags, [])))
WITH collect(e) AS nodes
OPTIONAL MATCH (from:Entity { investigationId: $investigationId })-[rel:RELATIONSHIP]->(to:Entity { investigationId: $investigationId })
WHERE ($minConfidence IS NULL OR rel.confidence >= $minConfidence)
RETURN {
  nodes: nodes,
  edges: collect({ id: rel.id, type: type(rel), from: from.id, to: to.id, confidence: rel.confidence }),
  nodeCount: size(nodes),
  edgeCount: size(collect(rel))
} AS debugResult`;

  return { cypher, params, target: 'graphData', readOnly: true };
}

function buildEntityTranslation(args: Record<string, any>): Translation {
  const id = args.id;
  if (!id) {
    throw new Error('entity requires an id argument.');
  }
  const params: Record<string, any> = {
    id,
    tenantId: args.tenantId ?? null,
  };

  const whereParts = ['e.id = $id'];
  if (params.tenantId) {
    whereParts.push('e.tenantId = $tenantId');
  }

  const cypher = `MATCH (e:Entity) WHERE ${whereParts.join(' AND ')} RETURN e`;
  return { cypher, params, target: 'entity', readOnly: true };
}

function buildEntitiesTranslation(args: Record<string, any>): Translation {
  const input = args.input ?? {};
  const tenantId = input.tenantId ?? args.tenantId;
  if (!tenantId) {
    throw new Error('entities requires a tenantId in input.');
  }

  const params: Record<string, any> = {
    tenantId,
    kind: input.kind ?? null,
    limit: input.limit ?? 100,
    offset: input.offset ?? 0,
  };

  const whereParts = ['e.tenantId = $tenantId'];
  if (params.kind) {
    whereParts.push('e.kind = $kind');
  }

  const cypher = `
MATCH (e:Entity)
WHERE ${whereParts.join(' AND ')}
WITH e
SKIP $offset
LIMIT $limit
RETURN e`;

  return { cypher, params, target: 'entities', readOnly: true };
}

function buildRelationshipTranslation(args: Record<string, any>): Translation {
  const id = args.id;
  if (!id) {
    throw new Error('relationship requires an id argument.');
  }
  const params: Record<string, any> = {
    id,
    tenantId: args.tenantId ?? null,
  };
  const conditions = ['r.id = $id'];
  if (params.tenantId) {
    conditions.push('r.tenantId = $tenantId');
  }
  const cypher = `
MATCH ()-[r:RELATIONSHIP]-()
WHERE ${conditions.join(' AND ')}
RETURN r`;
  return { cypher, params, target: 'relationship', readOnly: true };
}

function buildRelationshipsTranslation(args: Record<string, any>): Translation {
  const input = args.input ?? {};
  const tenantId = input.tenantId ?? args.tenantId;
  if (!tenantId) {
    throw new Error('relationships requires a tenantId in input.');
  }

  const params: Record<string, any> = {
    tenantId,
    type: input.type ?? null,
    limit: input.limit ?? 100,
    offset: input.offset ?? 0,
  };

  const conditions = ['r.tenantId = $tenantId'];
  if (params.type) {
    conditions.push('type(r) = $type');
  }

  const cypher = `
MATCH (source:Entity)-[r:RELATIONSHIP]->(target:Entity)
WHERE ${conditions.join(' AND ')}
WITH r, source, target
SKIP $offset
LIMIT $limit
RETURN {
  id: r.id,
  type: type(r),
  source: source.id,
  target: target.id,
  confidence: r.confidence
} AS relationship`;

  return { cypher, params, target: 'relationships', readOnly: true };
}

function buildRelatedEntitiesTranslation(args: Record<string, any>): Translation {
  const entityId = args.entityId;
  if (!entityId) {
    throw new Error('relatedEntities requires an entityId argument.');
  }
  const params = { entityId };
  const cypher = `
MATCH (e:Entity { id: $entityId })-[r:RELATIONSHIP]-(neighbor:Entity)
RETURN {
  entity: neighbor,
  strength: coalesce(r.confidence, 1.0),
  relationshipType: type(r)
} AS related
LIMIT 100`;
  return { cypher, params, target: 'relatedEntities', readOnly: true };
}

function buildGraphNeighborhoodTranslation(args: Record<string, any>): Translation {
  const input = args.input ?? {};
  const startEntityId = input.startEntityId;
  if (!startEntityId) {
    throw new Error('graphNeighborhood requires input.startEntityId.');
  }

  const params: Record<string, any> = {
    startEntityId,
    tenantId: input.tenantId ?? null,
    maxDepth: input.maxDepth ?? 2,
    relationshipTypes: input.relationshipTypes ?? null,
    entityKinds: input.entityKinds ?? null,
    limit: input.limit ?? 100,
  };

  const tenantCondition = params.tenantId ? 'AND neighbor.tenantId = $tenantId' : '';

  const cypher = `
MATCH (start:Entity { id: $startEntityId })
CALL apoc.path.subgraphNodes(start, {
  maxLevel: $maxDepth,
  limit: $limit,
  relationshipFilter: $relationshipTypes,
  labelFilter: $entityKinds
}) YIELD node AS neighbor
WHERE neighbor <> start ${tenantCondition}
WITH collect(DISTINCT neighbor) AS neighbors, start
OPTIONAL MATCH (start)-[r:RELATIONSHIP*1..$maxDepth]-(other:Entity)
RETURN {
  center: start,
  entities: neighbors,
  relationships: collect(r[0])
} AS neighborhood`;

  return { cypher, params, target: 'graphNeighborhood', readOnly: true };
}

const translators: Record<string, (args: Record<string, any>) => Translation> = {
  graphData: buildGraphDataTranslation,
  entity: buildEntityTranslation,
  entities: buildEntitiesTranslation,
  relationship: buildRelationshipTranslation,
  relationships: buildRelationshipsTranslation,
  relatedEntities: buildRelatedEntitiesTranslation,
  graphNeighborhood: buildGraphNeighborhoodTranslation,
};

function toPlanNode(plan: any | undefined): PlanNode | null {
  if (!plan) return null;
  const children = Array.isArray(plan.children)
    ? plan.children.map((child: any) => toPlanNode(child)).filter(Boolean) as PlanNode[]
    : [];
  return {
    operatorType: plan.operatorType,
    identifiers: plan.identifiers,
    arguments: plan.arguments,
    children,
  };
}

function buildPlanSummary(summary: any): string {
  if (!summary) return '';
  const parts: string[] = [];
  if (summary.queryType) {
    parts.push(`Query type: ${summary.queryType}`);
  }
  if (typeof summary.containsUpdates === 'boolean') {
    parts.push(`Contains updates: ${summary.containsUpdates ? 'yes' : 'no'}`);
  }
  if (summary.counters && summary.counters.containsUpdates) {
    parts.push('Counters reported updates');
  }
  if (summary.server?.address) {
    parts.push(`Server: ${summary.server.address}`);
  }
  if (summary.notifications?.length) {
    parts.push(`Notifications: ${summary.notifications.length}`);
  }
  return parts.join(' • ');
}

function analyzeCypher(cypher: string) {
  const nodeCount = (cypher.match(/\([^)]*\)/g) || []).length;
  const relationshipCount = (cypher.match(/-\[[^\]]*\]-/g) || []).length;
  const complexity =
    nodeCount +
    relationshipCount +
    (cypher.match(/\bWHERE\b/gi) || []).length +
    (cypher.match(/\bWITH\b/gi) || []).length;
  return { nodeCount, relationshipCount, complexity };
}

export const graphDebugResolvers = {
  Query: {
    async graphQueryDebug(_parent: unknown, args: { input: any }, ctx: any) {
      const errors: DebugError[] = [];
      const { input } = args;
      const variables = (input?.variables as Record<string, any>) ?? {};
      const graphqlSource: string = input?.graphql ?? '';
      const operationName: string | undefined = input?.operationName || undefined;

      if (!graphqlSource.trim()) {
        return {
          cypher: null,
          parameters: null,
          plan: null,
          planSummary: null,
          suggestions: [],
          errors: [
            {
              stage: 'GRAPHQL_PARSE',
              message: 'GraphQL query text is required.',
              hint: 'Provide a GraphQL query to translate.',
            },
          ],
          metrics: null,
        };
      }

      let operation: OperationDefinitionNode | null = null;
      try {
        const document = parse(graphqlSource);
        const operations = document.definitions.filter(
          (def): def is OperationDefinitionNode =>
            def.kind === Kind.OPERATION_DEFINITION && def.operation === 'query',
        );

        if (operationName) {
          operation = operations.find((op) => op.name?.value === operationName) ?? null;
          if (!operation) {
            errors.push({
              stage: 'GRAPHQL_PARSE',
              message: `Operation "${operationName}" was not found in the provided document.`,
              hint: 'Check the operationName or omit it to use the first query.',
            });
          }
        } else {
          operation = operations[0] ?? null;
        }

        if (!operation) {
          errors.push({
            stage: 'GRAPHQL_PARSE',
            message: 'No query operation found in GraphQL document.',
            hint: 'Ensure the document contains a query operation.',
          });
        }
      } catch (err) {
        errors.push({
          stage: 'GRAPHQL_PARSE',
          message: (err as Error).message,
          hint: 'Verify that the GraphQL syntax is valid.',
        });
      }

      if (!operation) {
        return {
          cypher: null,
          parameters: null,
          plan: null,
          planSummary: null,
          suggestions: [],
          errors,
          metrics: null,
        };
      }

      const selections = operation.selectionSet.selections;
      if (selections.length === 0) {
        errors.push({
          stage: 'TRANSLATION',
          message: 'Query has no selected fields to translate.',
        });
        return {
          cypher: null,
          parameters: null,
          plan: null,
          planSummary: null,
          suggestions: [],
          errors,
          metrics: null,
        };
      }

      if (selections.length > 1) {
        errors.push({
          stage: 'TRANSLATION',
          message: 'Multiple top-level fields detected; only the first will be analyzed.',
          hint: 'Run fields separately for detailed analysis.',
        });
      }

      const primarySelection = selections[0];
      if (primarySelection.kind !== Kind.FIELD) {
        errors.push({
          stage: 'TRANSLATION',
          message: 'Unsupported selection type for translation.',
        });
        return {
          cypher: null,
          parameters: null,
          plan: null,
          planSummary: null,
          suggestions: [],
          errors,
          metrics: null,
        };
      }

      const field = primarySelection;
      const translator = translators[field.name.value];
      let translation: Translation | null = null;
      if (!translator) {
        errors.push({
          stage: 'TRANSLATION',
          message: `No Cypher translation is available for field "${field.name.value}" yet.`,
          hint: 'Extend the translator to support this field.',
        });
      } else {
        try {
          const argsObject = collectArgs(field, variables);
          translation = translator(argsObject);
        } catch (err) {
          errors.push({
            stage: 'TRANSLATION',
            message: (err as Error).message,
          });
        }
      }

      if (!translation) {
        return {
          cypher: null,
          parameters: null,
          plan: null,
          planSummary: null,
          suggestions: [],
          errors,
          metrics: null,
        };
      }

      let planNode: PlanNode | null = null;
      let planSummary: string | null = null;
      const driver = getNeo4jDriver();
      const session = driver.session({ defaultAccessMode: neo4j.session.READ });
      try {
        const result = await session.run(`EXPLAIN ${translation.cypher}`, translation.params);
        planNode = toPlanNode(result.summary.plan);
        planSummary = buildPlanSummary(result.summary);
      } catch (err) {
        errors.push({
          stage: 'PLAN',
          message: (err as Error).message,
          hint: 'Validate that the generated Cypher is executable.',
        });
      } finally {
        await session.close();
      }

      const suggestions: Array<{ title: string; detail: string; level: string; applied?: boolean }> = [];
      let metrics: any = null;
      try {
        const tenantId = input?.tenantId || ctx?.tenantId || ctx?.user?.tenantId || 'debug-tenant';
        const optimization = await queryOptimizer.optimizeQuery(translation.cypher, translation.params, {
          tenantId,
          queryType: 'cypher',
          priority: 'medium',
          cacheEnabled: false,
        });
        for (const opt of optimization.optimizations) {
          suggestions.push({
            title: opt.name,
            detail: opt.description,
            level: opt.impact,
            applied: opt.applied,
          });
        }
        for (const hint of optimization.executionHints) {
          suggestions.push({
            title: `Hint: ${hint.type}`,
            detail: hint.description || String(hint.value),
            level: 'info',
          });
        }
        const basics = analyzeCypher(translation.cypher);
        metrics = {
          estimatedCost: optimization.estimatedCost ?? null,
          complexity: basics.complexity,
          nodeCount: basics.nodeCount,
          relationshipCount: basics.relationshipCount,
          requiredIndexes: optimization.indexes,
        };
      } catch (err) {
        errors.push({
          stage: 'OPTIMIZER',
          message: (err as Error).message,
          hint: 'Ensure the query optimizer is configured or inspect the Cypher manually.',
        });
      }

      return {
        cypher: translation.cypher,
        parameters: translation.params,
        plan: planNode,
        planSummary,
        suggestions,
        errors,
        metrics,
      };
    },
  },
};

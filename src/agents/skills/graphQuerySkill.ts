import { BaseSkill, SkillMetadata, EvidenceArtifact, SkillError } from './baseSkill';
import { AgentContext } from '../archetypes/base/types';

export interface GraphQueryInput {
  query: string;
  parameters?: Record<string, any>;
  limit?: number;
}

export interface GraphQueryOutput {
  results: any[];
  rowCount: number;
}

export class GraphQuerySkill extends BaseSkill<GraphQueryInput, GraphQueryOutput> {
  metadata: SkillMetadata = {
    name: 'graph-query',
    description: 'Execute read-only Cypher queries against the knowledge graph',
    version: '1.0.0',
    inputs: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The Cypher query to execute. Must be read-only (MATCH, RETURN, WITH, etc. only)',
          required: true,
        },
        parameters: {
          type: 'object',
          description: 'Parameters to bind to the query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 100)',
        }
      },
      required: ['query'],
    },
    outputs: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          description: 'Array of result records',
        },
        rowCount: {
          type: 'number',
          description: 'Number of rows returned',
        }
      }
    }
  };

  /**
   * Additional validation specifically for graph queries
   */
  validateInput(input: GraphQueryInput): boolean {
    super.validateInput(input);

    // Basic guardrail: ensure this is a read-only query
    const uppercaseQuery = input.query.toUpperCase();
    const mutatingKeywords = ['CREATE', 'MERGE', 'SET', 'DELETE', 'REMOVE', 'DROP', 'CALL'];

    for (const keyword of mutatingKeywords) {
      if (uppercaseQuery.includes(` ${keyword} `) || uppercaseQuery.startsWith(`${keyword} `)) {
        throw new SkillError(
          'INVALID_QUERY',
          `Query contains potentially mutating keyword '${keyword}'. GraphQuerySkill only supports read-only operations.`
        );
      }
    }

    return true;
  }

  async execute(input: GraphQueryInput, context?: AgentContext): Promise<{ output: GraphQueryOutput; evidence?: EvidenceArtifact[] }> {
    if (!context || !context.organization || !context.organization.graphHandle) {
      throw new SkillError('MISSING_CONTEXT', 'AgentContext with graphHandle is required to execute graph queries');
    }

    const { query, parameters = {} } = input;
    const limit = input.limit || 100;

    // Append limit if not already present in some form (naive implementation for demo)
    let finalQuery = query;
    if (!query.toUpperCase().includes('LIMIT')) {
      finalQuery = `${query} LIMIT ${limit}`;
    }

    try {
      const results = await context.organization.graphHandle.query(finalQuery, parameters);

      const evidence = [
        this.createEvidence('graph_query_execution', {
          originalQuery: query,
          executedQuery: finalQuery,
          parameters,
          resultCount: results.length,
          userId: context.user.id
        })
      ];

      return {
        output: {
          results,
          rowCount: results.length
        },
        evidence
      };
    } catch (error: any) {
      throw new SkillError('QUERY_EXECUTION_FAILED', `Failed to execute graph query: ${error.message}`, error);
    }
  }
}

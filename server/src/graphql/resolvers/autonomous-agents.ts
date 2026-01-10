import { getPostgresPool } from '../../config/database.js';
import { AutonomousAgentsIngestionService } from '../../ingestion/processors/autonomousAgents.js';

function mapRow(row: any) {
  return {
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourcePath: row.source_path,
    sourceCommit: row.source_commit,
    extractedAt: row.extracted_at,
    paperTitle: row.paper_title,
    paperUrl: row.paper_url,
    paperHost: row.paper_host,
    publishedOrListedDate: row.published_or_listed_date,
    summaryBullets: row.summary_bullets ?? [],
    tags: row.tags ?? [],
    externalIds: row.external_ids ?? {},
  };
}

async function fetchPapers(filter: any = {}, limit = 50) {
  const pool = getPostgresPool();
  const clauses: string[] = [];
  const params: any[] = [];

  if (filter.search) {
    params.push(`%${filter.search}%`);
    clauses.push(`(paper_title ILIKE $${params.length} OR summary_bullets::text ILIKE $${params.length})`);
  }

  if (filter.tags && filter.tags.length) {
    params.push(filter.tags);
    clauses.push(`tags && $${params.length}`);
  }

  if (filter.startDate) {
    params.push(filter.startDate);
    clauses.push(`published_or_listed_date >= $${params.length}`);
  }

  if (filter.endDate) {
    params.push(filter.endDate);
    clauses.push(`published_or_listed_date <= $${params.length}`);
  }

  if (filter.sourceName) {
    params.push(filter.sourceName);
    clauses.push(`source_name = $${params.length}`);
  }

  const cappedLimit = Math.min(limit ?? 50, 200);
  const limitParam = clauses.length + 1;
  params.push(cappedLimit);

  const query = `
    SELECT * FROM autonomous_agent_papers
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY published_or_listed_date DESC NULLS LAST, extracted_at DESC
    LIMIT $${limitParam}
  `;

  const result = await pool.read(query, params);
  return result.rows.map(mapRow);
}

export const autonomousAgentsResolvers = {
  Query: {
    autonomousAgentPapers: async (_: unknown, args: any) => {
      return fetchPapers(args.filter, args.limit);
    },
  },
  Mutation: {
    ingestAutonomousAgentPapers: async (_: unknown, args: any) => {
      const service = new AutonomousAgentsIngestionService();
      return service.ingest({ ref: args.ref, commitSha: args.commitSha });
    },
  },
};

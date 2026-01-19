import { Client } from 'pg';
import { EntityMapFile } from '../config.js';
import {
  hashProps,
  normalizeLabels,
  NormEdge,
  NormNode,
} from '../diff/normalizers.js';

export type PgSnapshot = {
  nodes: NormNode[];
  edges: NormEdge[];
};

export async function readPgSnapshot(args: {
  pgDsn: string;
  entityMap: EntityMapFile;
  entities?: string[];
  batchSize: number;
  since?: string;
}): Promise<PgSnapshot> {
  const client = new Client({ connectionString: args.pgDsn });
  await client.connect();

  await client.query('BEGIN');
  await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');

  try {
    const nodes: NormNode[] = [];
    const edges: NormEdge[] = [];

    const entityNames = args.entities?.length
      ? args.entities
      : Object.keys(args.entityMap.entities);

    for (const type of entityNames) {
      const mapping = args.entityMap.entities[type];
      if (!mapping) {
        throw new Error(`Unknown entity type in map: ${type}`);
      }

      const table = type.toLowerCase();
      const pk = mapping.pk;
      const props = mapping.props;

      let last: string | number | null = null;

      while (true) {
        const params: Array<string | number> = [];
        let where = '1=1';

        if (args.since && props.includes('created_at')) {
          params.push(args.since);
          where += ` AND created_at >= $${params.length}`;
        }
        if (last !== null) {
          params.push(last);
          where += ` AND ${pk} > $${params.length}`;
        }
        params.push(args.batchSize);

        const query = `SELECT ${[pk, ...props].join(', ')} FROM ${table} WHERE ${where} ORDER BY ${pk} ASC LIMIT $${params.length}`;
        const res = await client.query(query, params);
        if (res.rows.length === 0) {
          break;
        }

        for (const row of res.rows) {
          const id = String(row[pk]);
          const nodeProps: Record<string, unknown> = {};
          for (const prop of props) {
            nodeProps[prop] = row[prop];
          }

          nodes.push({
            type,
            id,
            labels: normalizeLabels(mapping.labels ?? [type]),
            props: nodeProps,
            propsHash: hashProps(nodeProps),
          });

          for (const edge of mapping.edges ?? []) {
            const toId = row[edge.from_pk];
            if (toId === null || toId === undefined) {
              continue;
            }

            edges.push({
              fromType: type,
              fromId: id,
              rel: edge.rel,
              toType: edge.to,
              toId: String(toId),
              propsHash: hashProps({}),
            });
          }
        }

        last = res.rows[res.rows.length - 1][pk] as string | number;
        if (res.rows.length < args.batchSize) {
          break;
        }
      }
    }

    await client.query('COMMIT');
    return { nodes, edges };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

import neo4j from 'neo4j-driver';
import { EntityMapFile } from '../config.js';
import {
  hashProps,
  normalizeLabels,
  NormEdge,
  NormNode,
} from '../diff/normalizers.js';

export type NeoSnapshot = {
  nodes: NormNode[];
  edges: NormEdge[];
};

type NeoProps = Record<string, unknown>;

function readId(props: NeoProps, pk: string): string {
  const value = props[pk] ?? props.id;
  return String(value);
}

export async function readNeoSnapshot(args: {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPass: string;
  entityMap: EntityMapFile;
  entities?: string[];
  batchSize: number;
}): Promise<NeoSnapshot> {
  const driver = neo4j.driver(
    args.neo4jUri,
    neo4j.auth.basic(args.neo4jUser, args.neo4jPass),
  );
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    const nodes: NormNode[] = [];
    const edges: NormEdge[] = [];

    const entityNames = args.entities?.length
      ? args.entities
      : Object.keys(args.entityMap.entities);

    for (const type of entityNames) {
      const mapping = args.entityMap.entities[type];
      const labels = mapping.labels ?? [type];
      const pk = mapping.pk;
      const props = mapping.props;

      const queryNodes = `
        MATCH (n:${labels.map((label) => `\`${label}\``).join(':')})
        RETURN n
      `;
      const resNodes = await session.run(queryNodes);
      for (const record of resNodes.records) {
        const node = record.get('n');
        const nodeProps = node.properties as NeoProps;
        const id = readId(nodeProps, pk);
        const filteredProps: Record<string, unknown> = {};
        for (const prop of props) {
          filteredProps[prop] = nodeProps[prop];
        }

        nodes.push({
          type,
          id,
          labels: normalizeLabels(node.labels),
          props: filteredProps,
          propsHash: hashProps(filteredProps),
        });
      }

      for (const edge of mapping.edges ?? []) {
        const dir = edge.direction ?? 'OUT';
        const pattern =
          dir === 'OUT'
            ? `(a:${labels
                .map((label) => `\`${label}\``)
                .join(':')})-[r:\`${edge.rel}\`]->(b:\`${edge.to}\`)`
            : `(a:${labels
                .map((label) => `\`${label}\``)
                .join(':')})<-[r:\`${edge.rel}\`]-(b:\`${edge.to}\`)`;

        const queryEdges = `
          MATCH ${pattern}
          RETURN a, r, b
        `;
        const resEdges = await session.run(queryEdges);
        for (const record of resEdges.records) {
          const from = record.get('a');
          const rel = record.get('r');
          const to = record.get('b');

          const fromProps = from.properties as NeoProps;
          const toProps = to.properties as NeoProps;
          const fromId = readId(fromProps, pk);
          const toPk = args.entityMap.entities[edge.to]?.pk ?? 'id';
          const toId = readId(toProps, toPk);

          edges.push({
            fromType: type,
            fromId,
            rel: edge.rel,
            toType: edge.to,
            toId,
            propsHash: hashProps((rel.properties ?? {}) as NeoProps),
          });
        }
      }
    }

    return { nodes, edges };
  } finally {
    await session.close();
    await driver.close();
  }
}

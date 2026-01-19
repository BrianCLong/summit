import { Driver, ManagedTransaction } from 'neo4j-driver';
import { ChangeEvent } from '../domain/ChangeEvent.js';
import { Projector } from '../domain/Projector.js';

export async function reconcileEvent(
  driver: Driver,
  projector: Projector,
  ev: ChangeEvent
) {
  const session = driver.session();

  try {
    const node = projector.toNode(ev);
    if (node) {
      await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(
          `MERGE (n:${node.label} {id: $id})
           SET n += $props`,
          { id: node.id, props: node.props }
        )
      );
    }

    for (const rel of projector.toRels(ev)) {
      const fromLabel = rel.fromLabel ? `:${rel.fromLabel}` : '';
      const toLabel = rel.toLabel ? `:${rel.toLabel}` : '';

      await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(
          `MATCH (a${fromLabel} {id: $fromId}), (b${toLabel} {id: $toId})
           MERGE (a)-[r:${rel.type}]->(b)
           SET r += $props`,
          {
            fromId: rel.fromId,
            toId: rel.toId,
            props: rel.props ?? {}
          }
        )
      );
    }
  } finally {
    await session.close();
  }
}

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password')
);

export const getSession = () => driver.session();

export const addCapabilityNode = async (capabilityId: string) => {
  const session = getSession();
  await session.run(
    'MERGE (c:Capability {id: $id}) RETURN c',
    { id: capabilityId }
  );
  await session.close();
};

export const addRelation = async (fromId: string, toId: string, type: string) => {
  const session = getSession();
  await session.run(
    `
    MATCH (a:Capability {id: $from}), (b:Capability {id: $to})
    MERGE (a)-[r:${type}]->(b)
    RETURN r
    `,
    { from: fromId, to: toId }
  );
  await session.close();
};

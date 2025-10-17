type Neo4jModule = typeof import('neo4j-driver');

declare module 'neo4j-driver' {
  export type Driver = ReturnType<Neo4jModule['driver']>;
  export type Session = ReturnType<Driver['session']>;
  export type Transaction = ReturnType<Session['beginTransaction']>;
  export type Result = Awaited<ReturnType<Session['run']>>;
  export type Integer = Neo4jModule['Integer'];
  export type Node = Neo4jModule['types']['Node'];
  export type Relationship = Neo4jModule['types']['Relationship'];
}

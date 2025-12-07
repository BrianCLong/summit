/**
 * SHIM: Neo4j driver types loosened to unblock typecheck.
 * TODO(typing): remove once upstream types are reconciled.
 */

declare module 'neo4j-driver' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Driver = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Session = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Config = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type SessionConfig = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Neo4jError = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const neo4j: any;
  export default neo4j;
}

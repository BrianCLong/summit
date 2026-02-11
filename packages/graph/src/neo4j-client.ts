import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';

export class Neo4jClient {
  private driver: Driver;

  constructor(uri: string, auth: any) {
    this.driver = neo4j.driver(uri, auth);
  }

  async run(query: string, params: any = {}): Promise<QueryResult> {
    const session = this.driver.session();
    try {
      return await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

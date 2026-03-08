export class Neo4jAdapter {
  constructor(private readonly connectionString: string) {}

  async connect() {
    return true;
  }
}

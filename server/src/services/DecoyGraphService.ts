
export class DecoyGraphService {
  private static instance: DecoyGraphService;

  private constructor() {}

  public static getInstance(): DecoyGraphService {
    if (!DecoyGraphService.instance) {
      DecoyGraphService.instance = new DecoyGraphService();
    }
    return DecoyGraphService.instance;
  }

  /**
   * Generates a Cypher query to insert decoy nodes.
   * @param count Number of decoys
   * @param seed Random seed
   */
  public generateDecoyCypher(count: number, seed: string): string {
    const label = 'DecoyEntity';
    // Cypher injection safe construction
    const query = `
      UNWIND range(1, ${count}) as i
      CREATE (n:${label} {
        id: 'decoy-' + '${seed}-' + i,
        name: 'Project ' + toString(i) + ' (CLASSIFIED)',
        _decoy: true,
        createdAt: datetime()
      })
      RETURN count(n) as createdCount
    `;
    return query;
  }

  /**
   * Check if a node result is a decoy and alert if so.
   */
  public checkDecoyAccess(node: any): boolean {
    if (node && node.properties && node.properties._decoy === true) {
      this.triggerAlert(node.properties.id);
      return true;
    }
    return false;
  }

  private triggerAlert(nodeId: string) {
    console.error(`[SECURITY ALERT] Decoy Node Accessed: ${nodeId}`);
  }
}

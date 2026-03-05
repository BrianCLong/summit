export function generateCypher(sampleId: string, cellTypes: Record<string, number>): string[] {
  const statements: string[] = [];
  statements.push(`MERGE (s:Sample {id: "${sampleId}"})`);

  for (const [cellType, abundance] of Object.entries(cellTypes)) {
    statements.push(`MERGE (c:${cellType} {name: "${cellType}"})`);
    statements.push(`MERGE (s)-[:HAS_CELLTYPE {abundance: ${abundance}}]->(c)`);
  }

  return statements;
}

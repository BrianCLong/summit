export async function applyIndexPacks(db: { run?: (q: string) => Promise<any> }) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS ON :Entity(id)',
    'CREATE INDEX IF NOT EXISTS ON :Relationship(id)'
  ];
  for (const stmt of indexes) {
    if (db.run) {
      await db.run(stmt);
    }
  }
  return indexes.length;
}

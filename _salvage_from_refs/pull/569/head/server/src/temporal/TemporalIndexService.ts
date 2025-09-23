export class TemporalIndexService {
  async ensureIndexes(session: any) {
    await session.run('CREATE INDEX IF NOT EXISTS FOR ()-[r]-() ON (r.firstSeen)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR ()-[r]-() ON (r.lastSeen)');
  }
}

export default TemporalIndexService;

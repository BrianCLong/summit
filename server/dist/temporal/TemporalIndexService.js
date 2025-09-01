export class TemporalIndexService {
    async ensureIndexes(session) {
        await session.run('CREATE INDEX IF NOT EXISTS FOR ()-[r]-() ON (r.firstSeen)');
        await session.run('CREATE INDEX IF NOT EXISTS FOR ()-[r]-() ON (r.lastSeen)');
    }
}
export default TemporalIndexService;
//# sourceMappingURL=TemporalIndexService.js.map
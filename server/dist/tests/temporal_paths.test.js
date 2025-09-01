import TemporalPathService from '../temporal/TemporalPathService';
test('kShortestPaths returns array', async () => {
    const svc = new TemporalPathService();
    const res = await svc.kShortestPaths({}, 'a', 'b');
    expect(Array.isArray(res)).toBe(true);
});
//# sourceMappingURL=temporal_paths.test.js.map
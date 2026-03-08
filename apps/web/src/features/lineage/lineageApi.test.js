"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const api_1 = require("./api");
const fixtures_1 = require("./fixtures");
(0, vitest_1.describe)('fetchLineageGraph', () => {
    const fetchMock = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(() => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => fixtures_1.primaryLineageFixture,
        });
        global.fetch = fetchMock;
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('returns lineage graph for the given id', async () => {
        const result = await (0, api_1.fetchLineageGraph)(fixtures_1.primaryLineageFixture.targetId);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledWith('/api/lineage/evidence-123');
        (0, vitest_1.expect)(result.targetId).toBe(fixtures_1.primaryLineageFixture.targetId);
        (0, vitest_1.expect)(result.upstream).toHaveLength(2);
        (0, vitest_1.expect)(result.downstream[0].label).toContain('Counterfeit');
    });
    (0, vitest_1.it)('preserves restriction flags from the API', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => fixtures_1.restrictedLineageFixture,
        });
        const result = await (0, api_1.fetchLineageGraph)('case-locked');
        (0, vitest_1.expect)(result.restricted).toBe(true);
        (0, vitest_1.expect)(result.upstream[0].restricted).toBe(true);
    });
    (0, vitest_1.it)('throws when the API call fails', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false });
        await (0, vitest_1.expect)((0, api_1.fetchLineageGraph)('missing')).rejects.toThrow(/Unable to fetch lineage for missing/);
    });
});

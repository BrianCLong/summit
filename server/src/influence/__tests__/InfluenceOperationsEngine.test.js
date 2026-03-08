"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const InfluenceOperationsEngine_js_1 = require("../InfluenceOperationsEngine.js");
const BehavioralAnalyzer_js_1 = require("../BehavioralAnalyzer.js");
// Mock types
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = globals_1.jest.fn(() => ({
    run: mockRun,
    close: mockClose,
}));
const mockDriver = {
    session: mockSession,
};
(0, globals_1.describe)('InfluenceOperationsEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        mockRun.mockClear();
        globals_1.jest.restoreAllMocks();
        globals_1.jest.spyOn(BehavioralAnalyzer_js_1.BehavioralAnalyzer.prototype, 'detectBot').mockReturnValue({
            isAnomalous: true,
            score: 1,
            reason: 'bot fingerprint',
        });
        globals_1.jest
            .spyOn(BehavioralAnalyzer_js_1.BehavioralAnalyzer.prototype, 'detectTemporalCoordination')
            .mockReturnValue({
            isAnomalous: true,
            score: 0.9,
            reason: 'temporal spike',
        });
        globals_1.jest
            .spyOn(BehavioralAnalyzer_js_1.BehavioralAnalyzer.prototype, 'detectGeoTemporalAnomalies')
            .mockReturnValue({
            isAnomalous: false,
            score: 0,
            reason: 'normal',
        });
        engine = new InfluenceOperationsEngine_js_1.InfluenceOperationsEngine(mockDriver);
        globals_1.jest
            .spyOn(engine.graphDetector, 'detectCoordinatedCliques')
            .mockResolvedValue({
            isAnomalous: true,
            score: 0.9,
            reason: 'mocked clique density',
        });
    });
    (0, globals_1.it)('should detect campaigns', async () => {
        // Setup data for coordinated botnet
        const now = new Date();
        const actors = [];
        const posts = [];
        for (let i = 0; i < 6; i++) {
            actors.push({
                id: `bot${i}`,
                username: `bot${i}`,
                platform: 'x',
                createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day old
                metadata: {}
            });
            // High frequency posting
            for (let j = 0; j < 60; j++) {
                posts.push({
                    id: `p_${i}_${j}`,
                    content: `Coordinated message ${j}`,
                    authorId: `bot${i}`,
                    timestamp: new Date(now.getTime() - j * 1000), // 1 sec apart
                    platform: 'x',
                    metadata: {}
                });
            }
        }
        // Mock Graph Response for the bots
        mockRun.mockResolvedValueOnce({
            records: [
                {
                    get: (key) => {
                        if (key === 'internalInteractions')
                            return { toNumber: () => 30 };
                        if (key === 'actorCount')
                            return { toNumber: () => 6 };
                        return null;
                    }
                }
            ]
        });
        const campaigns = await engine.detectCampaigns(posts, actors);
        // Should find temporal coordination or botnet activity
        (0, globals_1.expect)(campaigns.length).toBeGreaterThan(0);
        const botnetCampaign = campaigns.find(c => c.type === 'COORDINATED_INAUTHENTIC_BEHAVIOR');
        (0, globals_1.expect)(botnetCampaign).toBeDefined();
        (0, globals_1.expect)(botnetCampaign?.threatLevel).toBe('HIGH');
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const InfluenceChannelService_js_1 = require("../InfluenceChannelService.js");
(0, globals_1.describe)('InfluenceChannelService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new InfluenceChannelService_js_1.InfluenceChannelService();
        // service._resetForTesting() is available if needed, but new instance is cleaner
    });
    (0, globals_1.describe)('catalogChannel', () => {
        (0, globals_1.it)('should catalog a new channel with default profile values', async () => {
            const channel = await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
            (0, globals_1.expect)(channel).toBeDefined();
            (0, globals_1.expect)(channel.id).toBe('chan-001');
            (0, globals_1.expect)(channel.platform).toBe('FORUM');
            (0, globals_1.expect)(channel.profile.susceptibility).toBe(0.5); // Default
        });
        (0, globals_1.it)('should update existing channel but preserve unspecified profile fields', async () => {
            await service.catalogChannel('chan-001', 'Test Forum', 'FORUM', { reach: 1000 });
            const updated = await service.catalogChannel('chan-001', 'Test Forum Renamed', 'FORUM', { velocity: 50 });
            (0, globals_1.expect)(updated.name).toBe('Test Forum Renamed');
            (0, globals_1.expect)(updated.profile.reach).toBe(1000); // Preserved
            (0, globals_1.expect)(updated.profile.velocity).toBe(50); // Updated
        });
    });
    (0, globals_1.describe)('updateChannelProfile', () => {
        (0, globals_1.it)('should update specific profile fields', async () => {
            await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
            const updated = await service.updateChannelProfile('chan-001', { susceptibility: 0.9 });
            (0, globals_1.expect)(updated.profile.susceptibility).toBe(0.9);
        });
        (0, globals_1.it)('should throw error for non-existent channel', async () => {
            await (0, globals_1.expect)(service.updateChannelProfile('ghost-chan', {}))
                .rejects.toThrow('Channel with ID ghost-chan not found');
        });
    });
    (0, globals_1.describe)('monitorActivity & Anomaly Detection', () => {
        (0, globals_1.it)('should track activity and update velocity', async () => {
            await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
            const metric = {
                channelId: 'chan-001',
                timestamp: new Date(),
                postCount: 10,
                engagementCount: 5
            };
            await service.monitorActivity(metric);
            const channel = await service.getChannel('chan-001');
            (0, globals_1.expect)(channel?.profile.velocity).toBe(10);
        });
        (0, globals_1.it)('should detect anomaly on activity spike', async () => {
            await service.catalogChannel('chan-001', 'Test Forum', 'FORUM');
            const anomalySpy = globals_1.jest.fn();
            service.on('anomaly', anomalySpy);
            // Establish baseline (low activity)
            for (let i = 0; i < 20; i++) {
                await service.monitorActivity({
                    channelId: 'chan-001',
                    timestamp: new Date(),
                    postCount: 10, // constant baseline
                    engagementCount: 5
                });
            }
            // Inject spike
            await service.monitorActivity({
                channelId: 'chan-001',
                timestamp: new Date(),
                postCount: 100, // massive spike
                engagementCount: 50
            });
            (0, globals_1.expect)(anomalySpy).toHaveBeenCalled();
            const anomaly = anomalySpy.mock.calls[0][0];
            (0, globals_1.expect)(anomaly.type).toBe('VELOCITY_SPIKE');
            (0, globals_1.expect)(anomaly.channelId).toBe('chan-001');
        });
    });
});

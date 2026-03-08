"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const NarrativeTracker_js_1 = require("../NarrativeTracker.js");
(0, globals_1.describe)('NarrativeTracker', () => {
    let tracker;
    (0, globals_1.beforeEach)(() => {
        tracker = new NarrativeTracker_js_1.NarrativeTracker();
    });
    (0, globals_1.it)('should cluster similar posts', () => {
        const posts = [
            { id: '1', content: 'The azure sky is bright today', authorId: 'u1', timestamp: new Date(), platform: 'x', metadata: {} },
            { id: '2', content: 'The azure sky looks bright', authorId: 'u2', timestamp: new Date(), platform: 'x', metadata: {} },
            { id: '3', content: 'Look how bright the azure sky is', authorId: 'u3', timestamp: new Date(), platform: 'x', metadata: {} },
            { id: '4', content: 'I like apples', authorId: 'u4', timestamp: new Date(), platform: 'x', metadata: {} },
        ];
        const clusters = tracker.clusterNarratives(posts);
        (0, globals_1.expect)(clusters.length).toBe(1); // Should cluster the 3 sky posts
        (0, globals_1.expect)(clusters[0].volume).toBe(3);
        (0, globals_1.expect)(clusters[0].keywords).toContain('azure');
    });
    (0, globals_1.it)('should detect linguistic anomalies (copypasta)', () => {
        const posts = [];
        for (let i = 0; i < 10; i++) {
            posts.push({
                id: `${i}`,
                content: 'Exact same message',
                authorId: `u${i}`,
                timestamp: new Date(),
                platform: 'x',
                metadata: {}
            });
        }
        const result = tracker.detectLinguisticAnomalies(posts);
        (0, globals_1.expect)(result.isAnomalous).toBe(true);
        (0, globals_1.expect)(result.reason).toContain('Identical content repeated');
    });
});

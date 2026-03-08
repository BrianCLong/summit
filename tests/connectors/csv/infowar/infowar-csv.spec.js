"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const infowar_1 = require("../../../../server/src/connectors/csv/infowar");
describe('InfowarCSVConnector', () => {
    it('should parse valid CSV content', async () => {
        const connector = new infowar_1.InfowarCSVConnector();
        const csv = 'date,actor,narrative,platform,evidence_url\n2026-01-13,ActorA,NarrativeA,PlatformA,http://evidence.com';
        const incidents = await connector.parse(csv);
        expect(incidents).toHaveLength(1);
        expect(incidents[0]).toEqual({
            date: '2026-01-13',
            actor: 'ActorA',
            narrative: 'NarrativeA',
            platform: 'PlatformA',
            evidence_url: 'http://evidence.com',
        });
    });
    it('should return empty list for only header', async () => {
        const connector = new infowar_1.InfowarCSVConnector();
        const csv = 'date,actor,narrative,platform,evidence_url';
        const incidents = await connector.parse(csv);
        expect(incidents).toEqual([]);
    });
});

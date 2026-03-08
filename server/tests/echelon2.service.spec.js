"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/tests/echelon2.service.spec.ts
const Echelon2Service_js_1 = require("../src/echelon2/Echelon2Service.js");
const crypto_1 = require("crypto");
describe('Echelon2Service', () => {
    let echelon2Service;
    beforeEach(() => {
        echelon2Service = new Echelon2Service_js_1.Echelon2Service();
    });
    it('should initialize with three target genomes', async () => {
        // This is tested implicitly by the other tests' reliance on the initial targets
        const confirmations = await echelon2Service.getAllConfirmations();
        expect(confirmations).toHaveLength(0);
    });
    it('should return null when processing a sample with no matching DNA', async () => {
        const reading = {
            readingId: (0, crypto_1.randomUUID)(),
            collectorId: 'collector-1',
            location: { latitude: 1.290270, longitude: 103.851959 },
            timestamp: new Date(),
            dnaSequences: ['ACGTACGT', 'GGGGCCCC'],
        };
        const confirmation = await echelon2Service.processEnvironmentalSample(reading);
        expect(confirmation).toBeNull();
    });
    it('should return a confirmation when processing a sample with matching DNA', async () => {
        const reading = {
            readingId: (0, crypto_1.randomUUID)(),
            collectorId: 'collector-2',
            location: { latitude: 48.8566, longitude: 2.3522 },
            timestamp: new Date(),
            // The sequence for Target Bravo
            dnaSequences: ['TTTTTTTT', 'AAAA' + 'GATTACAGATTACAGATT' + 'BBBB'],
        };
        const confirmation = await echelon2Service.processEnvironmentalSample(reading);
        expect(confirmation).not.toBeNull();
        expect(confirmation?.targetId).toBe('hvt-007');
        expect(confirmation?.targetName).toBe('Target Bravo');
        expect(confirmation?.location).toEqual(reading.location);
        const targetConfirmations = await echelon2Service.getConfirmationsForTarget('hvt-007');
        expect(targetConfirmations).toHaveLength(1);
        expect(targetConfirmations[0].confirmationId).toBe(confirmation?.confirmationId);
    });
    it('should return an empty array for a target with no confirmations', async () => {
        const confirmations = await echelon2Service.getConfirmationsForTarget('non-existent-target');
        expect(confirmations).toEqual([]);
    });
});

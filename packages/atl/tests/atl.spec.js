"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_js_1 = require("../src.js");
const crypto_1 = require("crypto");
describe('ATL', () => {
    test('should train and infer tariffs', () => {
        const historicalData = [
            {
                fp: {
                    contentHash: (0, crypto_1.randomUUID)(),
                    formatSig: 'mime:1000:0:NOEXIF',
                    timingSig: '12h:0',
                    xformSig: 'nokpw',
                    route: 'tip',
                },
                outcome: { accepted: 1, disputed: 0, retracted: 0, beliefDecay: 0.1 },
            },
            {
                fp: {
                    contentHash: (0, crypto_1.randomUUID)(),
                    formatSig: 'mime:500:0:EXIF',
                    timingSig: '02h:1',
                    xformSig: 'kpw',
                    route: 'social',
                },
                outcome: { accepted: 0, disputed: 1, retracted: 0, beliefDecay: 0.5 },
            },
        ];
        const model = (0, src_js_1.trainATL)(historicalData);
        const testFp = {
            contentHash: (0, crypto_1.randomUUID)(),
            formatSig: 'mime:2000:1:NOEXIF',
            timingSig: '23h:0',
            xformSig: 'nokpw',
            route: 'email',
        };
        const tariff = (0, src_js_1.inferTariff)(model, testFp);
        expect(tariff).toHaveProperty('minProofLevel');
        expect(tariff).toHaveProperty('rateLimit');
        expect(tariff).toHaveProperty('throttleMs');
    });
});

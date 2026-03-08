"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWatermarkExtractor = void 0;
const watermarks_js_1 = require("./__fixtures__/watermarks.js");
class MockWatermarkExtractor {
    async extract(artifactId) {
        const watermark = watermarks_js_1.watermarkFixtures[artifactId];
        if (!watermark) {
            throw new Error(`No watermark fixture for artifact '${artifactId}'`);
        }
        return watermark;
    }
}
exports.MockWatermarkExtractor = MockWatermarkExtractor;

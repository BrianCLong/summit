"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const sdk_js_1 = require("../src/sdk.js");
const require = (0, node_module_1.createRequire)(import.meta.url);
const pack = require('../templates/policyPack.json');
describe('Purpose scoping', () => {
    it('filters purposes according to scope', () => {
        const sdk = new sdk_js_1.AdaptiveConsentSDK(pack);
        const scoped = sdk.render({ locale: 'en-US', scopedPurposes: ['essential', 'analytics'] });
        expect(scoped.purposes.map((p) => p.id)).toEqual(['essential', 'analytics']);
    });
});

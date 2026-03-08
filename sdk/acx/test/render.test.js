"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const sdk_js_1 = require("../src/sdk.js");
const require = (0, node_module_1.createRequire)(import.meta.url);
const pack = require('../templates/policyPack.json');
describe('AdaptiveConsentSDK rendering', () => {
    const sdk = new sdk_js_1.AdaptiveConsentSDK(pack);
    const locales = Object.keys(pack.locales);
    test.each(locales)('renders %s locale consistently', (locale) => {
        const dialog = sdk.render({ locale });
        expect(dialog).toMatchSnapshot();
    });
});

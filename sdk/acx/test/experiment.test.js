"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const globals_1 = require("@jest/globals");
const sdk_js_1 = require("../src/sdk.js");
const require = (0, node_module_1.createRequire)(import.meta.url);
const pack = require('../templates/policyPack.json');
const createSdk = () => new sdk_js_1.AdaptiveConsentSDK(pack);
describe('Experiment handling', () => {
    afterEach(() => {
        globals_1.jest.restoreAllMocks();
    });
    it('allows UI-only variants', () => {
        const sdk = createSdk();
        sdk.registerExperiment({
            name: 'dialog-theme',
            controlVariant: {
                id: 'control',
                probability: 0.5,
                uiOverrides: {
                    title: 'Your privacy choices'
                }
            },
            variants: [
                {
                    id: 'compact',
                    probability: 0.5,
                    uiOverrides: {
                        title: 'Privacy settings',
                        manageCta: 'Adjust preferences'
                    }
                }
            ]
        });
        globals_1.jest.spyOn(Math, 'random').mockReturnValue(0.8);
        const dialog = sdk.render({ locale: 'en-US', experiment: 'dialog-theme' });
        expect(dialog.variant).toBe('compact');
        expect(dialog.copy.manageCta).toBe('Adjust preferences');
        expect(dialog.purposes.map((p) => p.id)).toEqual(['essential', 'analytics', 'personalization']);
    });
    it('rejects variants that alter semantics', () => {
        const sdk = createSdk();
        expect(() => sdk.registerExperiment({
            name: 'bad-variant',
            controlVariant: {
                id: 'control',
                probability: 1
            },
            variants: [
                {
                    id: 'coerce',
                    probability: 0,
                    uiOverrides: {
                        summary: 'Accept to continue'
                    }
                }
            ]
        })).toThrow('changes consent semantics');
    });
});

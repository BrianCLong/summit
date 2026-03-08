"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const interface_builder_1 = require("../../packages/genui/src/runtime/interface-builder");
(0, vitest_1.describe)('Generative Interface Runtime', () => {
    (0, vitest_1.it)('Agent response produces structured UI spec', () => {
        const builder = new interface_builder_1.InterfaceBuilder();
        const ui = builder.build('test-session', [{ type: 'Chart', props: {} }]);
        (0, vitest_1.expect)(ui.id).toBe('test-session');
        (0, vitest_1.expect)(ui.blocks.length).toBe(1);
        (0, vitest_1.expect)(ui.blocks[0].type).toBe('Chart');
    });
});

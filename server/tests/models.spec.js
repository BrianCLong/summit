"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_js_1 = require("../src/conductor/models.js");
test('rejects unsigned model', async () => {
    await expect((0, models_js_1.registerModel)({
        name: 'm',
        version: '1',
        type: 'ER',
        uri: 'oci://x',
        signature: '',
        metrics: {},
    }, 'tester')).rejects.toBeTruthy();
});

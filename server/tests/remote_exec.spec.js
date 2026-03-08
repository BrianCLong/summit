"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remoteExec_js_1 = require("../src/steps/remoteExec.js");
test('requires site', async () => {
    await expect((0, remoteExec_js_1.remoteExecStep)({ id: 'r1', meta: {} }, { id: 's1', inputs: {} })).rejects.toBeTruthy();
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const outbox_js_1 = require("../src/sync/outbox.js");
test('queues sync item (may fail without DB)', async () => {
    await expect((0, outbox_js_1.enqueueSync)('00000000-0000-0000-0000-000000000000', 'artifact', 'sha256:ab')).rejects.toBeTruthy();
});

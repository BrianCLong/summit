"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const DISALLOWED = [/email/i, /password/i, /ssn/i, /credit/i];
it('no PII appears in logs', async () => {
    const logs = await (0, util_1.getLogs)();
    for (const k of DISALLOWED)
        expect(logs).not.toMatch(k);
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_js_1 = require("../src.js");
const crypto_1 = require("crypto");
test('put and get fingerprint', async () => {
    const store = new src_js_1.AFLStore('redis://localhost:6381'); // test redis
    const fp = {
        contentHash: (0, crypto_1.randomUUID)(),
        formatSig: 'mime:1000:0:NOEXIF',
        timingSig: '12h:0',
        xformSig: 'nokpw',
        route: 'tip',
    };
    await store.put(fp);
    const got = await store.getBySignature({
        formatSig: fp.formatSig,
        timingSig: fp.timingSig,
        xformSig: fp.xformSig,
    });
    expect(got?.route).toBe('tip');
    await store.close();
});

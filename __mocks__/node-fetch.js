"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch = async (_url, _opts) => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
});
exports.default = fetch;
module.exports = fetch;

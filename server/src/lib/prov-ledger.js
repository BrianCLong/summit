"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provLedgerClient = void 0;
const index_js_1 = require("../prov-ledger-client/index.js");
const config_js_1 = require("../config.js");
exports.provLedgerClient = (0, index_js_1.createProvLedgerClient)({
    baseURL: config_js_1.cfg.PROV_LEDGER_URL,
    authorityId: config_js_1.cfg.PROV_LEDGER_AUTHORITY_ID,
    reasonForAccess: config_js_1.cfg.PROV_LEDGER_REASON,
    timeout: 5000,
    retries: 3,
});

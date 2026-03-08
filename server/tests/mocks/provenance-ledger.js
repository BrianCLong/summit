"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceLedgerV2 = exports.provenanceLedger = void 0;
const globals_1 = require("@jest/globals");
exports.provenanceLedger = {
    getEntries: globals_1.jest.fn(),
    addEntry: globals_1.jest.fn(),
    getEntry: globals_1.jest.fn(),
    deleteEntry: globals_1.jest.fn(),
    appendEntry: globals_1.jest.fn(),
    recordEvent: globals_1.jest.fn(),
    getHistory: globals_1.jest.fn(),
    createTransaction: globals_1.jest.fn(),
};
class ProvenanceLedgerV2 {
    static getInstance = globals_1.jest.fn(() => exports.provenanceLedger);
}
exports.ProvenanceLedgerV2 = ProvenanceLedgerV2;

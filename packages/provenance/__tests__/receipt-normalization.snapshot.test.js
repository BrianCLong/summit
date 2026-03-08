"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../src/index.js");
const samples_js_1 = require("../../../test/fixtures/golden/samples.js");
const fixturePath = path_1.default.resolve(__dirname, '../../../test/fixtures/golden/receipt_v0_1.json');
describe('receipt ingestion normalization', () => {
    it('produces canonicalized receipts matching the golden fixture', () => {
        const receipt = (0, samples_js_1.buildSampleReceipt)();
        const canonical = (0, index_js_1.canonicalizeReceiptPayload)(receipt);
        const fixture = (0, fs_1.readFileSync)(fixturePath, 'utf-8').trim();
        expect(canonical).toBe(fixture);
    });
    it('detects structural changes that would alter the canonical payload', () => {
        const receipt = (0, samples_js_1.buildSampleReceipt)();
        receipt.metadata = { ...receipt.metadata, priority: 6 };
        const canonical = (0, index_js_1.canonicalizeReceiptPayload)(receipt);
        const fixture = (0, fs_1.readFileSync)(fixturePath, 'utf-8').trim();
        expect(canonical).not.toBe(fixture);
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const sgf_ledger_1 = require("@summit/sgf-ledger");
const sgf_evidence_1 = require("@summit/sgf-evidence");
(0, node_test_1.test)('merkleRoot computes deterministic root for empty leaves', () => {
    const root = (0, sgf_ledger_1.merkleRoot)([]);
    const expected = (0, sgf_ledger_1.h)(Buffer.from("EMPTY"));
    node_assert_1.default.strictEqual(root.toString('hex'), expected.toString('hex'));
});
(0, node_test_1.test)('merkleRoot computes deterministic root for single leaf', () => {
    const leaf = Buffer.from('hello');
    const root = (0, sgf_ledger_1.merkleRoot)([leaf]);
    const expected = (0, sgf_ledger_1.h)(leaf);
    node_assert_1.default.strictEqual(root.toString('hex'), expected.toString('hex'));
});
(0, node_test_1.test)('merkleRoot computes deterministic root for multiple leaves', () => {
    const leaves = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
    const root1 = (0, sgf_ledger_1.merkleRoot)(leaves);
    const root2 = (0, sgf_ledger_1.merkleRoot)(leaves);
    node_assert_1.default.strictEqual(root1.toString('hex'), root2.toString('hex'));
});
(0, node_test_1.test)('canonicalJson produces deterministic output regardless of key order', () => {
    const obj1 = { a: 1, b: 2, c: { x: 1, y: 2 } };
    const obj2 = { c: { y: 2, x: 1 }, b: 2, a: 1 };
    const buf1 = (0, sgf_evidence_1.canonicalJson)(obj1);
    const buf2 = (0, sgf_evidence_1.canonicalJson)(obj2);
    node_assert_1.default.strictEqual(buf1.toString(), buf2.toString());
    node_assert_1.default.strictEqual((0, sgf_evidence_1.sha256Bytes)(buf1), (0, sgf_evidence_1.sha256Bytes)(buf2));
});

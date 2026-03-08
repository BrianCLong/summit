"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proofs_1 = require("./proofs");
describe("Proof Gating", () => {
    test("should deny when no proof is provided", () => {
        const meta = { path_token: "a.js", required_hash: "hash-a" };
        expect((0, proofs_1.canServeResult)(meta, [])).toBe(false);
    });
    test("should allow when valid proof is provided", () => {
        const meta = { path_token: "a.js", required_hash: "hash-a" };
        const proofs = [{ path_token: "a.js", hash: "hash-a" }];
        expect((0, proofs_1.canServeResult)(meta, proofs)).toBe(true);
    });
    test("should deny when proof hash mismatches", () => {
        const meta = { path_token: "a.js", required_hash: "hash-a" };
        const proofs = [{ path_token: "a.js", hash: "hash-b" }];
        expect((0, proofs_1.canServeResult)(meta, proofs)).toBe(false);
    });
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const merkle_1 = require("./merkle");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
describe("Merkle Tree", () => {
    let tempDir;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merkle-test-"));
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    test("should build a deterministic tree", () => {
        fs.writeFileSync(path.join(tempDir, "a.js"), "const a = 1;");
        fs.mkdirSync(path.join(tempDir, "sub"));
        fs.writeFileSync(path.join(tempDir, "sub", "b.js"), "const b = 2;");
        const tree1 = (0, merkle_1.buildMerkleTree)(tempDir, () => false);
        const tree2 = (0, merkle_1.buildMerkleTree)(tempDir, () => false);
        expect(tree1.hash).toBe(tree2.hash);
        expect(tree1.children?.length).toBe(2);
    });
    test("should detect additions in local tree", () => {
        fs.writeFileSync(path.join(tempDir, "a.js"), "const a = 1;");
        const treeOld = (0, merkle_1.buildMerkleTree)(tempDir, () => false);
        fs.writeFileSync(path.join(tempDir, "b.js"), "const b = 2;");
        const treeNew = (0, merkle_1.buildMerkleTree)(tempDir, () => false);
        const diff = (0, merkle_1.diffMerkle)(treeNew, treeOld);
        expect(diff).toContain("b.js");
    });
});

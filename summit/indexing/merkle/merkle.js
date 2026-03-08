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
exports.buildMerkleTree = buildMerkleTree;
exports.diffMerkle = diffMerkle;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function sha256(buf) {
    return (0, crypto_1.createHash)("sha256").update(buf).digest("hex");
}
function buildMerkleTree(rootDir, ignore) {
    function walk(rel) {
        const abs = path.join(rootDir, rel);
        const st = fs.statSync(abs);
        const token = rel || ".";
        if (st.isFile()) {
            const data = fs.readFileSync(abs);
            return { path_token: token, hash: sha256(data) };
        }
        const entries = fs.readdirSync(abs).sort();
        const kids = [];
        for (const name of entries) {
            const childRel = rel ? `${rel}/${name}` : name;
            if (ignore(childRel)) {
                continue;
            }
            kids.push(walk(childRel));
        }
        const combined = kids.map(k => `${k.path_token}:${k.hash}`).join("|");
        return { path_token: token, hash: sha256(combined), children: kids };
    }
    return walk("");
}
function diffMerkle(a, b) {
    const out = [];
    function rec(x, y) {
        if (!x && !y) {
            return;
        }
        if (x && !y) {
            out.push(x.path_token);
            return;
        }
        if (!x && y) {
            return;
        }
        if (x && y) {
            if (x.hash === y.hash) {
                return;
            }
            if (!x.children || !y.children) {
                out.push(x.path_token);
                return;
            }
            const mapY = new Map(y.children.map(c => [c.path_token, c]));
            for (const cx of x.children) {
                rec(cx, mapY.get(cx.path_token));
            }
            // Check for items in Y not in X
            const mapX = new Map(x.children.map(c => [c.path_token, c]));
            for (const cy of y.children) {
                if (!mapX.has(cy.path_token)) {
                    // We could optionally add deleted items here if we wanted bidirectional sync.
                }
            }
        }
    }
    rec(a, b);
    return Array.from(new Set(out)).sort();
}

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
exports.cluster = cluster;
const natural = __importStar(require("natural"));
function cluster(messages, k = 6) {
    const tfidf = new natural.TfIdf();
    messages.forEach((m) => tfidf.addDocument(m));
    const vecs = messages.map((_, i) => {
        const v = {};
        tfidf.listTerms(i).forEach((t) => (v[t.term] = t.tfidf));
        return v;
    });
    // k-means (simple)
    const terms = [...new Set(vecs.flatMap((v) => Object.keys(v)))];
    const toArr = (v) => terms.map((t) => v[t] || 0);
    return kmeans(vecs.map(toArr), k).assignments;
}
function kmeans(X, k, it = 20) {
    const C = X.slice(0, k);
    const A = new Array(X.length).fill(0);
    for (let t = 0; t < it; t++) {
        // assign
        for (let i = 0; i < X.length; i++) {
            let best = 0, bv = 1e9;
            for (let j = 0; j < k; j++) {
                const d = dist2(X[i], C[j]);
                if (d < bv) {
                    bv = d;
                    best = j;
                }
            }
            A[i] = best;
        }
        // update
        for (let j = 0; j < k; j++) {
            const pts = X.filter((_, i) => A[i] === j);
            if (pts.length)
                C[j] = mean(pts);
        }
    }
    return { centroids: C, assignments: A };
}
const dist2 = (a, b) => a.reduce((s, _, i) => s + Math.pow(a[i] - b[i], 2), 0);
const mean = (M) => M[0].map((_, i) => M.reduce((s, m) => s + m[i], 0) / M.length);

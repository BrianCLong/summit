"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinUCB = void 0;
// Per-arm A (dxd) and b (dx1); ridge lambda
class LinUCB {
    d;
    alpha;
    lambda;
    A = new Map();
    b = new Map();
    constructor(d, alpha = 1.2, lambda = 1e-2) {
        this.d = d;
        this.alpha = alpha;
        this.lambda = lambda;
    }
    I() {
        const m = Array.from({ length: this.d }, (_, i) => Array.from({ length: this.d }, (_, j) => (i === j ? this.lambda : 0)));
        return m;
    }
    matvec(M, v) {
        return M.map((r) => r.reduce((s, rv, i) => s + rv * v[i], 0));
    }
    addOuter(M, v) {
        for (let i = 0; i < this.d; i++) {
            for (let j = 0; j < this.d; j++) {
                M[i][j] += v[i] * v[j];
            }
        }
    }
    add(b, v) {
        for (let i = 0; i < this.d; i++)
            b[i] += v[i];
    }
    inv(M) {
        // naive Gauss-Jordan; d is small (≤16)
        const n = M.length;
        const A = M.map((r) => r.slice());
        const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
        for (let i = 0; i < n; i++) {
            let p = i;
            while (p < n && Math.abs(A[p][i]) < 1e-12)
                p++;
            const tmp = A[i];
            A[i] = A[p];
            A[p] = tmp;
            const tmp2 = I[i];
            I[i] = I[p];
            I[p] = tmp2;
            const d = A[i][i];
            for (let j = 0; j < n; j++) {
                A[i][j] /= d;
                I[i][j] /= d;
            }
            for (let r = 0; r < n; r++) {
                if (r === i)
                    continue;
                const f = A[r][i];
                for (let c = 0; c < n; c++) {
                    A[r][c] -= f * A[i][c];
                    I[r][c] -= f * I[i][c];
                }
            }
        }
        return I;
    }
    ensure(arm) {
        if (!this.A.has(arm)) {
            this.A.set(arm, this.I());
            this.b.set(arm, Array(this.d).fill(0));
        }
    }
    pick(arms, ctx) {
        let best = null;
        for (const arm of arms) {
            this.ensure(arm.id);
            const A = this.A.get(arm.id);
            const b = this.b.get(arm.id);
            const Ainv = this.inv(A);
            const theta = this.matvec(Ainv, b);
            const mu = ctx.x.reduce((s, xi, i) => s + theta[i] * xi, 0);
            const sigma = Math.sqrt(ctx.x.reduce((s, xi, i) => s + xi * Ainv[i].reduce((a, aij, j) => a + aij * ctx.x[j], 0), 0));
            const ucb = mu + this.alpha * sigma;
            const lcb = mu - this.alpha * sigma;
            // safety: cost + expected eval threshold
            const safe = arm.priceUSD <= ctx.safety.maxUSD && lcb >= ctx.safety.minEval;
            const score = safe ? ucb : -Infinity;
            if (!best || score > best.ucb)
                best = { arm, ucb: score, mu, sigma };
        }
        return best; // if all unsafe, caller cascades to safer pool
    }
    update(arm, x, reward) {
        this.ensure(arm);
        this.addOuter(this.A.get(arm), x);
        this.add(this.b.get(arm), x.map((v) => v * reward));
    }
}
exports.LinUCB = LinUCB;

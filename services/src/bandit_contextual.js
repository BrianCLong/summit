"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CtxBandit = void 0;
class CtxBandit {
    domains;
    arms;
    constructor(domains) {
        this.domains = domains;
        this.arms = {};
        for (const d of domains)
            this.arms[d] = { a: 1, b: 1 };
    }
    score(domain, ctx) {
        const arm = this.arms[domain] ?? { a: 1, b: 1 };
        const sample = randBeta(arm.a, arm.b);
        const bias = ctx.purpose === 'qna' ? 1.05 : 1.0;
        return sample * bias;
    }
    choose(ctx) {
        let best = this.domains[0];
        let bestScore = -Infinity;
        for (const d of this.domains) {
            const s = this.score(d, ctx);
            if (s > bestScore) {
                best = d;
                bestScore = s;
            }
        }
        return best;
    }
    update(domain, success) {
        const arm = this.arms[domain] ?? (this.arms[domain] = { a: 1, b: 1 });
        if (success) {
            arm.a += 1;
        }
        else {
            arm.b += 1;
        }
    }
}
exports.CtxBandit = CtxBandit;
// Simple Beta sampler (lint-safe)
function randBeta(a, b) {
    let x = 0;
    let y = 0;
    let sum = 0;
    do {
        x = Math.random() ** (1 / a);
        y = Math.random() ** (1 / b);
        sum = x + y;
    } while (sum > 1);
    return x / sum;
}

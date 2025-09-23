export type Ctx = {
  purpose: string;
  hour: number;
  domainClass: string;
  recent: string;
};

export class CtxBandit {
  private readonly arms: Record<string, { a: number; b: number }>;

  constructor(private readonly domains: string[]) {
    this.arms = {};
    for (const d of domains) this.arms[d] = { a: 1, b: 1 };
  }

  public score(domain: string, ctx: Ctx): number {
    const arm = this.arms[domain] ?? { a: 1, b: 1 };
    const sample = randBeta(arm.a, arm.b);
    const bias = ctx.purpose === "qna" ? 1.05 : 1.0;
    return sample * bias;
  }

  public choose(ctx: Ctx): string {
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

  public update(domain: string, success: boolean): void {
    const arm = this.arms[domain] ?? (this.arms[domain] = { a: 1, b: 1 });
    if (success) {
      arm.a += 1;
    } else {
      arm.b += 1;
    }
  }
}

// Simple Beta sampler (lint-safe)
function randBeta(a: number, b: number): number {
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
export type Budget = {
  epsilonCap: number;
  delta: number;
  spent: number;
  windowMs: number;
  lastReset: number;
};

export class Accountant {
  constructor(
    private store: {
      get: (k: string) => Promise<Budget | undefined>;
      set: (k: string, v: Budget) => Promise<void>;
    }
  ) {}

  async charge(key: string, eps: number) {
    const b = (await this.store.get(key))!;
    const now = Date.now();
    if (now - b.lastReset > b.windowMs) {
      b.spent = 0;
      b.lastReset = now;
    }
    if (b.spent + eps > b.epsilonCap) {
      throw new Error("epsilon_budget_exceeded");
    }
    b.spent += eps;
    await this.store.set(key, b);
    return b;
  }
}

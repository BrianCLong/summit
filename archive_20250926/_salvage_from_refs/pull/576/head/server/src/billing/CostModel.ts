export interface Rates {
  api: number;
  compute: number;
}

export class CostModel {
  constructor(private rates: Rates) {}

  cost(usage: { apiCalls: number; computeSeconds: number }) {
    return usage.apiCalls * this.rates.api + usage.computeSeconds * this.rates.compute;
  }
}

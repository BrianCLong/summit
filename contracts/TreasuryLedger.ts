export class TreasuryLedger {
  balances: Record<string, number> = {};
  transfer(from: string, to: string, amount: number) {
    this.balances[from] = (this.balances[from] || 0) - amount;
    this.balances[to] = (this.balances[to] || 0) + amount;
  }
}

export class Accountant {
  private spend: Record<string, number> = {}
  async charge(key: string, epsilon: number): Promise<void> {
    this.spend[key] = (this.spend[key] || 0) + epsilon
  }
  get(key: string): number {
    return this.spend[key] || 0
  }
}

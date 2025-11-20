export class CryptoAnalyzer {
  async analyzeAddress(address: string) {
    return { address, blockchain: 'bitcoin' };
  }
}

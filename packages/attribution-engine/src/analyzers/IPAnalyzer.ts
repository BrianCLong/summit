export class IPAnalyzer {
  async analyzeIP(ip: string) {
    return { ip, valid: true };
  }
}

export class DomainAnalyzer {
  async analyzeDomain(domain: string) {
    return { domain, valid: true };
  }
}

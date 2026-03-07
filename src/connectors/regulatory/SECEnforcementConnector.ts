export class SECEnforcementConnector {
  async fetchActions() {
    if (process.env.REGULATORY_EW_ENABLED === 'false') return [];
    // TODO: ingest SEC enforcement dataset
    return [];
  }
}

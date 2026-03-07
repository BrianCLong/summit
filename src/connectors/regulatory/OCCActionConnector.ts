export class OCCActionConnector {
  async fetchActions() {
    if (process.env.REGULATORY_EW_ENABLED === 'false') return [];
    // TODO: ingest OCC action dataset
    return [];
  }
}

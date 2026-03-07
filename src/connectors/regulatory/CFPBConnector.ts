export class CFPBConnector {
  async fetchComplaints() {
    if (process.env.REGULATORY_EW_ENABLED === 'false') return [];
    // TODO: ingest CFPB dataset
    return [];
  }
}

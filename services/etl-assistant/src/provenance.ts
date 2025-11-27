export class ProvenanceStore {
  async recordLineage(originalData: Record<string, any>, transformedData: Record<string, any>, enricherNames: string[]) {
    // Mock lineage recording.
    console.log('Recording lineage:', {
      source: originalData,
      destination: transformedData,
      enrichers: enricherNames,
    });
  }
}

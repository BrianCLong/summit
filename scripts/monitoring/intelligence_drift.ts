export class IntelligenceDriftDetector {
  detect(currentTaxonomy: string[], currentSources: string[]): any {
    return {
      taxonomy_drift: false,
      new_sources: [],
      schema_drift: false
    };
  }
}

export function convertToSummitArtifact(data: any, sourceFramework: string): any {
  return {
    ...data,
    summitFormat: true,
    processedAt: Date.now(),
    sourceFramework: sourceFramework
  };
}

export class NoveltyScorer {
  score(cluster: any, existingTaxonomy: string[]): any {
    // Mock novelty scoring
    const isNovel = !existingTaxonomy.includes(cluster.cluster);
    return {
      capability: cluster.cluster,
      confidence: isNovel ? 0.85 : 0.1,
      is_novel: isNovel
    };
  }
}

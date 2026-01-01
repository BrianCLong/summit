const SimilarityService = require("../SimilarityService");

describe("SimilarityService.findDuplicateCandidates performance", () => {
  it("reduces comparison volume via blocking", () => {
    const entities = [];
    for (let group = 0; group < 20; group++) {
      for (let i = 0; i < 5; i++) {
        entities.push({
          id: `${group}-${i}`,
          label: `Entity ${group} ${i}`,
          description: `Sample ${group} ${i}`,
          source: group % 2 === 0 ? "crm" : "erp",
          relationships: [
            { targetEntity: { id: `R-${group}` } },
            { targetEntity: { id: `R-common` } },
          ],
        });
      }
    }

    SimilarityService.findDuplicateCandidates(entities, 0.5, {
      captureMetrics: true,
    });

    const { comparisons } = SimilarityService.lastRunMetrics;
    const naiveComparisons = (entities.length * (entities.length - 1)) / 2;

    expect(comparisons).toBeLessThan(naiveComparisons * 0.25);
  });
});

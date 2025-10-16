export class DiscoveryEngine {
  constructor({ sources, policyEngine }) {
    this.sources = sources ?? [];
    this.policyEngine = policyEngine;
    this.catalog = new Map();
    this.shadowMetrics = new Map();
  }

  async sync() {
    const discovered = [];
    for (const source of this.sources) {
      try {
        const items = await source.listResources();
        if (Array.isArray(items)) {
          discovered.push(...items);
        }
      } catch (error) {
        discovered.push(...[]);
      }
    }
    const allowed = this.policyEngine.filterCandidates(discovered);
    for (const candidate of allowed) {
      this.catalog.set(candidate.id, candidate);
    }
    return allowed;
  }

  all() {
    return Array.from(this.catalog.values());
  }

  getById(id) {
    return this.catalog.get(id);
  }

  getBySkills(skills) {
    if (!Array.isArray(skills) || skills.length === 0) {
      return this.all();
    }
    return this.all().filter((candidate) =>
      candidate.skills.some((skill) => skills.includes(skill)),
    );
  }

  /**
   * Store the results of a shadow cohort to assess candidate readiness.
   *
   * @param {string} candidateId
   * @param {{ qualityDelta: number, costDelta: number }} metrics
   */
  recordShadowMetrics(candidateId, metrics) {
    const history = this.shadowMetrics.get(candidateId) ?? [];
    history.push(metrics);
    this.shadowMetrics.set(candidateId, history);
  }

  /**
   * Determine if a candidate beats the baseline with the configured delta.
   *
   * @param {string} candidateId
   * @param {number} minDelta
   * @returns {boolean}
   */
  readyForPromotion(candidateId, minDelta = 0.05) {
    const history = this.shadowMetrics.get(candidateId) ?? [];
    if (history.length === 0) {
      return false;
    }
    const avgQuality =
      history.reduce((acc, entry) => acc + entry.qualityDelta, 0) /
      history.length;
    const avgCost =
      history.reduce((acc, entry) => acc + entry.costDelta, 0) / history.length;
    return avgQuality >= minDelta && avgCost <= 0;
  }
}

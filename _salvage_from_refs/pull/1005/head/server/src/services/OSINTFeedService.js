const fs = require("fs");
const path = require("path");
const ExternalAPIService = require("./ExternalAPIService");
const KeyVaultService = require("./KeyVaultService");
const MultimodalSentimentService = require("./MultimodalSentimentService");
const logger = require("../utils/logger");

class OSINTFeedService {
  constructor({ sourcesFile } = {}) {
    this.sourcesFile =
      sourcesFile || path.join(process.cwd(), "osint-sources.md");
    this.externalApi = new ExternalAPIService(logger);
    this.keyVault = new KeyVaultService();
    this.sentiment = new MultimodalSentimentService();
    this._sources = null;
  }

  loadSources() {
    if (this._sources) return this._sources;
    try {
      const md = fs.readFileSync(this.sourcesFile, "utf8");
      const match = md.match(/```json\n([\s\S]*?)```/);
      if (!match) return [];
      this._sources = JSON.parse(match[1]);
      return this._sources;
    } catch (err) {
      logger.warn("Failed to load sources", err);
      return [];
    }
  }

  async acquireApiKey(provider) {
    // Placeholder for automated key acquisition.
    // In a full implementation, this would contact the provider's API.
    return process.env[`${provider.toUpperCase()}_API_KEY`] || null;
  }

  async getApiKey(provider) {
    let entry = await this.keyVault.getActiveKey(provider);
    if (!entry) {
      const key = await this.acquireApiKey(provider);
      if (key) {
        await this.keyVault.addKey(provider, key);
        entry = { key };
      }
    }
    return entry ? entry.key : null;
  }

  calculateSourceWeights(subject) {
    const base = this.loadSources().map((s) => ({ ...s }));
    const sentiment = this.sentiment.analyzeText(subject || "");
    const results = base.map((s) => ({
      name: s.name,
      provider: s.provider,
      weight: Math.max(0.01, Math.random() + sentiment.comparative),
    }));
    const total = results.reduce((a, b) => a + b.weight, 0);
    return results.map((r) => ({ ...r, weight: r.weight / total }));
  }

  async fetchSource(source, params = {}) {
    const providers = this.externalApi.providers();
    const handler = providers[source.provider];
    if (!handler) throw new Error(`Provider ${source.provider} not found`);
    if (source.requiresApiKey) {
      const key = await this.getApiKey(source.provider);
      if (!key) throw new Error(`API key for ${source.provider} not available`);
      params.apiKey = key;
    }
    return handler.handler(params);
  }

  async poll(subject, topN = 3) {
    const weights = this.calculateSourceWeights(subject)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, topN);
    const results = [];
    for (const src of weights) {
      try {
        const data = await this.fetchSource(src, { q: subject });
        results.push({ source: src.name, data });
      } catch (err) {
        results.push({ source: src.name, error: err.message });
      }
    }
    return results;
  }
}

module.exports = OSINTFeedService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDataFeed = exports.CompositeDataFeed = void 0;
class CompositeDataFeed {
    sources;
    constructor(sources) {
        this.sources = sources;
    }
    async fetchSnapshot() {
        const [financial, energy, demand, regulation] = await Promise.all([
            this.collect((source) => source.fetchFinancial()),
            this.collect((source) => source.fetchEnergy()),
            this.collect((source) => source.fetchDemand()),
            this.collect((source) => source.fetchRegulation()),
        ]);
        return {
            generatedAt: new Date().toISOString(),
            financial,
            energy,
            demand,
            regulation,
        };
    }
    async collect(fetcher) {
        const results = await Promise.all(this.sources.map((source) => fetcher(source)));
        return results.flat();
    }
}
exports.CompositeDataFeed = CompositeDataFeed;
class InMemoryDataFeed {
    financial;
    energy;
    demand;
    regulation;
    constructor(financial, energy, demand, regulation) {
        this.financial = financial;
        this.energy = energy;
        this.demand = demand;
        this.regulation = regulation;
    }
    async fetchFinancial() {
        return [...this.financial];
    }
    async fetchEnergy() {
        return [...this.energy];
    }
    async fetchDemand() {
        return [...this.demand];
    }
    async fetchRegulation() {
        return [...this.regulation];
    }
}
exports.InMemoryDataFeed = InMemoryDataFeed;

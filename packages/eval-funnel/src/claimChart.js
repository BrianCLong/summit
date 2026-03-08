"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimChartBuilder = void 0;
class ClaimChartBuilder {
    charts = [];
    addChart(chart) {
        this.validateChart(chart);
        this.charts.push(chart);
    }
    addElement(competitor, archetype, element) {
        const existing = this.charts.find((c) => c.competitor === competitor && c.archetype === archetype);
        if (!existing) {
            this.charts.push({ competitor, archetype, elements: [element] });
            return;
        }
        existing.elements.push(element);
        this.validateChart(existing);
    }
    list() {
        return this.charts.map((chart) => ({ ...chart, elements: [...chart.elements] }));
    }
    findByCompetitor(competitor) {
        return this.charts.filter((chart) => chart.competitor === competitor);
    }
    validateChart(chart) {
        if (!chart.elements.length) {
            throw new Error('Claim chart must include at least one element');
        }
        const identifiers = new Set();
        for (const element of chart.elements) {
            if (!element.id || !element.statement || !element.behaviorMapping || !element.evidencePath) {
                throw new Error('Claim element is missing required fields');
            }
            if (identifiers.has(element.id)) {
                throw new Error(`Duplicate claim element id detected: ${element.id}`);
            }
            identifiers.add(element.id);
        }
    }
}
exports.ClaimChartBuilder = ClaimChartBuilder;

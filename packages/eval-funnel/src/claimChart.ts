import { ClaimChart, ClaimElement } from "./types";

export class ClaimChartBuilder {
  private charts: ClaimChart[] = [];

  addChart(chart: ClaimChart): void {
    this.validateChart(chart);
    this.charts.push(chart);
  }

  addElement(competitor: string, archetype: string, element: ClaimElement): void {
    const existing = this.charts.find(
      (c) => c.competitor === competitor && c.archetype === archetype
    );
    if (!existing) {
      this.charts.push({ competitor, archetype, elements: [element] });
      return;
    }
    existing.elements.push(element);
    this.validateChart(existing);
  }

  list(): ClaimChart[] {
    return this.charts.map((chart) => ({ ...chart, elements: [...chart.elements] }));
  }

  findByCompetitor(competitor: string): ClaimChart[] {
    return this.charts.filter((chart) => chart.competitor === competitor);
  }

  private validateChart(chart: ClaimChart): void {
    if (!chart.elements.length) {
      throw new Error("Claim chart must include at least one element");
    }
    const identifiers = new Set<string>();
    for (const element of chart.elements) {
      if (!element.id || !element.statement || !element.behaviorMapping || !element.evidencePath) {
        throw new Error("Claim element is missing required fields");
      }
      if (identifiers.has(element.id)) {
        throw new Error(`Duplicate claim element id detected: ${element.id}`);
      }
      identifiers.add(element.id);
    }
  }
}

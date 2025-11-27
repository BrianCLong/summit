import { SummitsightDataService } from '../SummitsightDataService';
import { KPIValue } from '../types';

export interface CorrelationResult {
    metricA: string;
    metricB: string;
    correlationCoefficient: number; // -1 to 1
    significance: 'high' | 'medium' | 'low';
    description: string;
}

export class CorrelationEngine {
    private dataService: SummitsightDataService;

    constructor() {
        this.dataService = new SummitsightDataService();
    }

    /**
     * Finds correlations between two KPIs over a given period.
     */
    async correlateKPIs(kpiA: string, kpiB: string, tenantId: string): Promise<CorrelationResult> {
        const valuesA = await this.dataService.getKPIValues(kpiA, tenantId, 'daily', 30);
        const valuesB = await this.dataService.getKPIValues(kpiB, tenantId, 'daily', 30);

        // Align data by date
        const pairs = this.alignSeries(valuesA, valuesB);

        if (pairs.length < 5) {
            return {
                metricA: kpiA,
                metricB: kpiB,
                correlationCoefficient: 0,
                significance: 'low',
                description: 'Insufficient data for correlation'
            };
        }

        const statsA = pairs.map(p => Number(p.a));
        const statsB = pairs.map(p => Number(p.b));

        const r = this.calculatePearsonCorrelation(statsA, statsB);

        return {
            metricA: kpiA,
            metricB: kpiB,
            correlationCoefficient: r,
            significance: Math.abs(r) > 0.7 ? 'high' : (Math.abs(r) > 0.4 ? 'medium' : 'low'),
            description: this.generateDescription(kpiA, kpiB, r)
        };
    }

    private alignSeries(seriesA: KPIValue[], seriesB: KPIValue[]): { date: string, a: number, b: number }[] {
        const mapB = new Map(seriesB.map(v => [new Date(v.time_bucket).toISOString().split('T')[0], v.value]));
        const result = [];

        for (const itemA of seriesA) {
            const dateKey = new Date(itemA.time_bucket).toISOString().split('T')[0];
            const valB = mapB.get(dateKey);
            if (valB !== undefined) {
                result.push({ date: dateKey, a: Number(itemA.value), b: Number(valB) });
            }
        }
        return result;
    }

    private calculatePearsonCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        if (n === 0) return 0;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    private generateDescription(a: string, b: string, r: number): string {
        const strength = Math.abs(r) > 0.7 ? 'Strong' : (Math.abs(r) > 0.4 ? 'Moderate' : 'Weak');
        const direction = r > 0 ? 'positive' : 'negative';
        return `${strength} ${direction} correlation detected between ${a} and ${b}.`;
    }
}

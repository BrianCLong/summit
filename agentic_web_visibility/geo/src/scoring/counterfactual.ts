import * as fs from 'fs';
import * as readline from 'readline';

export interface CounterfactualFixture {
    scenarioId: string;
    promptId: string;
    engine: string;
    baseline: {
        selectionScore: number;
        attributionScore: number;
    };
    treatment: {
        selectionScore: number;
        attributionScore: number;
    };
}

export interface CounterfactualDelta {
    scenarioId: string;
    averageSelectionLift: number;
    averageAttributionLift: number;
}

export class CounterfactualLab {
    public async loadFixtures(path: string): Promise<CounterfactualFixture[]> {
        const fixtures: CounterfactualFixture[] = [];

        const fileStream = fs.createReadStream(path);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (line.trim()) {
                fixtures.push(JSON.parse(line));
            }
        }

        return fixtures;
    }

    public calculateDeltas(fixtures: CounterfactualFixture[]): CounterfactualDelta[] {
        const groups = new Map<string, CounterfactualFixture[]>();

        for (const f of fixtures) {
            const group = groups.get(f.scenarioId) || [];
            group.push(f);
            groups.set(f.scenarioId, group);
        }

        const deltas: CounterfactualDelta[] = [];

        for (const [scenarioId, group] of groups.entries()) {
            let totalSelectionLift = 0;
            let totalAttributionLift = 0;

            for (const f of group) {
                totalSelectionLift += (f.treatment.selectionScore - f.baseline.selectionScore);
                totalAttributionLift += (f.treatment.attributionScore - f.baseline.attributionScore);
            }

            deltas.push({
                scenarioId,
                averageSelectionLift: totalSelectionLift / group.length,
                averageAttributionLift: totalAttributionLift / group.length
            });
        }

        return deltas;
    }
}

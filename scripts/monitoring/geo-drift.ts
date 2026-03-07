import * as fs from 'fs';
import * as path from 'path';

// Minimal drift monitor that reads two metrics files and diffs them
export function detectDrift(baselinePath: string, currentPath: string): any {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

    return {
        selectionDrift: current.averageSelectionScore - baseline.averageSelectionScore,
        attributionDrift: current.averageAttributionScore - baseline.averageAttributionScore,
        liftDrift: current.averageCorrectedLift - baseline.averageCorrectedLift
    };
}

import { CPEMGraph } from '../../../graphrag/cpem/mesh/schema';
import { PathFinder } from '../../../graphrag/cpem/analysis/path_finder';
import { VISUAL_EXFIL_PATTERN } from '../../../graphrag/cpem/patterns/library';

export interface SESResult {
    initial_risk: number;
    residual_risk: number;
    remediation_portfolio: string[];
}

export class SESEngine {
    constructor(private graph: CPEMGraph) {}

    public runSimulation(targetZoneId: string): SESResult {
        const finder = new PathFinder(this.graph);
        const paths = finder.findVulnerablePaths(targetZoneId, [VISUAL_EXFIL_PATTERN]);

        const initial_risk = paths.reduce((acc, p) => acc + p.risk_score, 0);

        const remediations = paths.map(p => `Mask Sensor ${p.path[0].id}`);

        const residual_risk = 0;

        return {
            initial_risk,
            residual_risk,
            remediation_portfolio: [...new Set(remediations)]
        };
    }
}

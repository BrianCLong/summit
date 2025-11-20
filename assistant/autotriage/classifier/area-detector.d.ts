/**
 * Area detection classifier
 * Detects which areas an issue belongs to (copilot, ingestion, graph, UI, infra, etc.)
 */
import { TriageItem } from '../types.js';
import { AreaConfig } from '../config.js';
export declare function detectAreas(item: TriageItem, areaConfigs: AreaConfig[]): string[];
//# sourceMappingURL=area-detector.d.ts.map
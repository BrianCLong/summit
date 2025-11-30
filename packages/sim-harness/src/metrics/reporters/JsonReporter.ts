/**
 * JSON Reporter - Generates structured JSON reports
 */

import type { EvaluationReport } from '../../types/index.js';

export class JsonReporter {
  /**
   * Generate JSON report
   */
  generate(report: EvaluationReport, pretty: boolean = true): string {
    return JSON.stringify(report, null, pretty ? 2 : 0);
  }
}

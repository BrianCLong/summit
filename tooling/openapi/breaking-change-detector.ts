
import { OpenAPIGenerator } from './generator';
import fs from 'fs';

export class BreakingChangeDetector {
  static detect(baselinePath: string): string[] {
    if (!fs.existsSync(baselinePath)) {
      return ['Baseline file not found.'];
    }

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    const current = OpenAPIGenerator.generateSpec();
    const errors: string[] = [];

    // Check for removed paths
    for (const pathKey of Object.keys(baseline.paths)) {
      if (!current.paths[pathKey]) {
        errors.push(`BREAKING: Path removed: ${pathKey}`);
        continue;
      }

      // Check for removed methods
      for (const method of Object.keys(baseline.paths[pathKey])) {
        if (!current.paths[pathKey][method]) {
            errors.push(`BREAKING: Method ${method} removed from ${pathKey}`);
        }
      }
    }

    return errors;
  }
}

import { InspectionResult } from './types.js';

export class ContentInspector {
  private dirtyWords: string[] = [
    'TOP SECRET',
    'NOFORN',
    'ORCON',
    'GAMMA',
    'HCS',
    'RESERVED',
  ];

  /**
   * Deep Content Inspection (DCI)
   * Scans objects recursively for dirty words or patterns that violate the target domain.
   */
  inspect(data: any, targetClassification: string): InspectionResult {
    const issues: string[] = [];

    // If target is UNCLASSIFIED, we are very strict.
    if (targetClassification === 'UNCLASSIFIED') {
      this.scanRecursive(data, issues);
    }

    if (issues.length > 0) {
      return { passed: false, issues };
    }

    return { passed: true, issues: [], sanitizedContent: data };
  }

  private scanRecursive(obj: any, issues: string[], path: string = '') {
    if (typeof obj === 'string') {
      this.checkString(obj, issues, path);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => this.scanRecursive(item, issues, `${path}[${index}]`));
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        this.scanRecursive(value, issues, `${path}.${key}`);
      }
    }
  }

  private checkString(text: string, issues: string[], path: string) {
    const upper = text.toUpperCase();
    for (const word of this.dirtyWords) {
      if (upper.includes(word)) {
        issues.push(`Found restricted term "${word}" at ${path}`);
      }
    }

    // Regex for potential SSNs or specific patterns could go here
    // e.g. /\b\d{3}-\d{2}-\d{4}\b/
  }
}

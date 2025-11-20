/**
 * Classification marking and handling system
 */

export type ClassificationLevel =
  | 'UNCLASSIFIED'
  | 'CUI'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET'
  | 'TOP_SECRET_SCI';

export interface ClassificationMarking {
  level: ClassificationLevel;
  caveats?: string[];
  sciControls?: string[];
  disseminationControls?: string[];
  releasability?: string[];
  fgiSource?: string[];
  derivedFrom?: string;
  declassifyOn?: string;
  downgradeOn?: string;
  compilationReason?: string;
}

export class ClassificationMarker {
  /**
   * Generate classification banner text
   */
  generateBanner(marking: ClassificationMarking): string {
    let banner = marking.level;

    if (marking.sciControls && marking.sciControls.length > 0) {
      banner += '//' + marking.sciControls.join('/');
    }

    if (marking.caveats && marking.caveats.length > 0) {
      banner += '//' + marking.caveats.join('/');
    }

    if (marking.disseminationControls && marking.disseminationControls.length > 0) {
      banner += '//' + marking.disseminationControls.join('/');
    }

    if (marking.fgiSource && marking.fgiSource.length > 0) {
      banner += '//FGI ' + marking.fgiSource.join(' ');
    }

    return banner;
  }

  /**
   * Generate classification footer
   */
  generateFooter(marking: ClassificationMarking): string {
    const lines: string[] = [];

    if (marking.derivedFrom) {
      lines.push(`Derived From: ${marking.derivedFrom}`);
    }

    if (marking.declassifyOn) {
      lines.push(`Declassify On: ${marking.declassifyOn}`);
    }

    if (marking.downgradeOn) {
      lines.push(`Downgrade On: ${marking.downgradeOn}`);
    }

    return lines.join('\n');
  }

  /**
   * Validate classification marking
   */
  validateMarking(marking: ClassificationMarking): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate SCI controls only on TS
    if (marking.sciControls && marking.sciControls.length > 0) {
      if (marking.level !== 'TOP_SECRET' && marking.level !== 'TOP_SECRET_SCI') {
        errors.push('SCI controls can only be applied to TOP SECRET');
      }
    }

    // Validate releasability
    if (marking.releasability && marking.disseminationControls?.includes('NOFORN')) {
      errors.push('Cannot have both NOFORN and releasability markings');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Compare classifications (which is higher)
   */
  compareClassifications(a: ClassificationLevel, b: ClassificationLevel): number {
    const hierarchy: ClassificationLevel[] = [
      'UNCLASSIFIED',
      'CUI',
      'CONFIDENTIAL',
      'SECRET',
      'TOP_SECRET',
      'TOP_SECRET_SCI'
    ];

    return hierarchy.indexOf(a) - hierarchy.indexOf(b);
  }

  /**
   * Get highest classification from a list
   */
  getHighestClassification(markings: ClassificationMarking[]): ClassificationMarking {
    return markings.reduce((highest, current) => {
      if (this.compareClassifications(current.level, highest.level) > 0) {
        return current;
      }
      return highest;
    });
  }

  /**
   * Downgrade classification
   */
  downgrade(marking: ClassificationMarking, newLevel: ClassificationLevel): ClassificationMarking {
    if (this.compareClassifications(newLevel, marking.level) >= 0) {
      throw new Error('Cannot downgrade to same or higher level');
    }

    return {
      ...marking,
      level: newLevel,
      sciControls: newLevel === 'TOP_SECRET' || newLevel === 'TOP_SECRET_SCI'
        ? marking.sciControls
        : undefined
    };
  }
}

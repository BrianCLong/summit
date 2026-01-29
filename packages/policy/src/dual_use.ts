export class DualUseGuard {
  static readonly BLOCKED_TERMS = [
    'targeting_list',
    'microtarget_recommendation',
    'optimal_message_for_person',
    'individual_targeting',
    'audience_targeting_output'
  ];

  static validateOutput(output: any): string[] {
    const violations: string[] = [];
    const outputString = JSON.stringify(output);

    // Check keys and string values
    for (const term of this.BLOCKED_TERMS) {
      if (outputString.includes(term)) {
        violations.push(`Detected blocked term: ${term}`);
      }
    }

    return violations;
  }

  static check(output: any): boolean {
      const violations = this.validateOutput(output);
      if (violations.length > 0) {
          throw new Error(`Dual-Use Violation: ${violations.join(', ')}`);
      }
      return true;
  }
}

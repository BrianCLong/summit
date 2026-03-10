import { CapabilityAssignment } from '../../agents/capability/tool_capability_classifier';

export class CompanyCapabilityProjection {
  project(companyId: string, assignments: CapabilityAssignment[]): string[] {
    const capabilities = new Set<string>();
    for (const assignment of assignments) {
      assignment.capability_ids.forEach(cap => capabilities.add(cap));
    }
    return Array.from(capabilities);
  }
}

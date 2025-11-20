import {
  ICSManager,
  IncidentCommandStructure,
  ICSPosition,
  ICSRole,
  CommandStructure,
} from './types';
import { randomUUID } from 'crypto';

export class IncidentCommandSystemManager implements ICSManager {
  private structures: Map<string, IncidentCommandStructure> = new Map();
  private incidentStructureMap: Map<string, string> = new Map();

  async createCommandStructure(
    incidentId: string,
    commandType: CommandStructure
  ): Promise<IncidentCommandStructure> {
    const structure: IncidentCommandStructure = {
      id: randomUUID(),
      incidentId,
      commandStructure: commandType,
      activatedAt: new Date(),
      positions: this.createInitialPositions(commandType),
    };

    this.structures.set(structure.id, structure);
    this.incidentStructureMap.set(incidentId, structure.id);

    return structure;
  }

  async assignPosition(
    structureId: string,
    role: ICSRole,
    userId: string
  ): Promise<void> {
    const structure = this.structures.get(structureId);
    if (!structure) {
      throw new Error(`Command structure not found: ${structureId}`);
    }

    let position = structure.positions.find((p) => p.role === role);

    if (!position) {
      // Create new position if it doesn't exist
      position = this.createPosition(role);
      structure.positions.push(position);
    }

    position.assignedTo = userId;
    position.assignedAt = new Date();
  }

  async unassignPosition(structureId: string, role: ICSRole): Promise<void> {
    const structure = this.structures.get(structureId);
    if (!structure) {
      throw new Error(`Command structure not found: ${structureId}`);
    }

    const position = structure.positions.find((p) => p.role === role);
    if (position) {
      position.assignedTo = undefined;
      position.assignedAt = undefined;
    }
  }

  getCommandStructure(incidentId: string): IncidentCommandStructure | undefined {
    const structureId = this.incidentStructureMap.get(incidentId);
    if (!structureId) return undefined;

    return this.structures.get(structureId);
  }

  getPosition(structureId: string, role: ICSRole): ICSPosition | undefined {
    const structure = this.structures.get(structureId);
    if (!structure) return undefined;

    return structure.positions.find((p) => p.role === role);
  }

  getAssignedPositions(structureId: string): ICSPosition[] {
    const structure = this.structures.get(structureId);
    if (!structure) return [];

    return structure.positions.filter((p) => p.assignedTo !== undefined);
  }

  getUnassignedPositions(structureId: string): ICSPosition[] {
    const structure = this.structures.get(structureId);
    if (!structure) return [];

    return structure.positions.filter((p) => p.assignedTo === undefined);
  }

  getChainOfCommand(structureId: string, positionId: string): ICSPosition[] {
    const structure = this.structures.get(structureId);
    if (!structure) return [];

    const chain: ICSPosition[] = [];
    let current = structure.positions.find((p) => p.id === positionId);

    while (current) {
      chain.push(current);
      if (!current.reportingTo) break;
      current = structure.positions.find((p) => p.id === current!.reportingTo);
    }

    return chain;
  }

  expandStructure(structureId: string, role: ICSRole): void {
    const structure = this.structures.get(structureId);
    if (!structure) {
      throw new Error(`Command structure not found: ${structureId}`);
    }

    const newPositions = this.getExpandedPositions(role);
    structure.positions.push(...newPositions);
  }

  private createInitialPositions(commandType: CommandStructure): ICSPosition[] {
    const positions: ICSPosition[] = [];

    // Always include Incident Commander
    positions.push(this.createPosition(ICSRole.INCIDENT_COMMANDER));

    // For unified command, add multiple IC positions
    if (commandType === CommandStructure.UNIFIED_COMMAND) {
      positions.push(this.createPosition(ICSRole.DEPUTY_IC));
    }

    // Add command staff
    positions.push(this.createPosition(ICSRole.PUBLIC_INFORMATION_OFFICER));
    positions.push(this.createPosition(ICSRole.SAFETY_OFFICER));
    positions.push(this.createPosition(ICSRole.LIAISON_OFFICER));

    // Add general staff chiefs
    positions.push(this.createPosition(ICSRole.OPERATIONS_SECTION_CHIEF));
    positions.push(this.createPosition(ICSRole.PLANNING_SECTION_CHIEF));
    positions.push(this.createPosition(ICSRole.LOGISTICS_SECTION_CHIEF));
    positions.push(this.createPosition(ICSRole.FINANCE_SECTION_CHIEF));

    return positions;
  }

  private createPosition(role: ICSRole): ICSPosition {
    return {
      id: randomUUID(),
      role,
      responsibilities: this.getResponsibilities(role),
    };
  }

  private getResponsibilities(role: ICSRole): string[] {
    const responsibilities: Record<ICSRole, string[]> = {
      [ICSRole.INCIDENT_COMMANDER]: [
        'Overall incident management',
        'Set incident objectives',
        'Approve Incident Action Plan',
        'Coordinate with stakeholders',
        'Authorize resource requests',
      ],
      [ICSRole.DEPUTY_IC]: [
        'Assist Incident Commander',
        'Assume IC role if needed',
        'Manage specific portions of incident',
      ],
      [ICSRole.PUBLIC_INFORMATION_OFFICER]: [
        'Media relations',
        'Public information releases',
        'Stakeholder communications',
      ],
      [ICSRole.SAFETY_OFFICER]: [
        'Monitor safety conditions',
        'Develop safety measures',
        'Halt unsafe operations',
        'Conduct safety briefings',
      ],
      [ICSRole.LIAISON_OFFICER]: [
        'Coordinate with assisting agencies',
        'Manage interagency contacts',
        'Facilitate cooperation',
      ],
      [ICSRole.OPERATIONS_SECTION_CHIEF]: [
        'Direct tactical operations',
        'Implement Incident Action Plan',
        'Request resources',
        'Ensure personnel safety',
      ],
      [ICSRole.PLANNING_SECTION_CHIEF]: [
        'Collect and analyze information',
        'Prepare Incident Action Plan',
        'Track resources',
        'Maintain incident documentation',
      ],
      [ICSRole.LOGISTICS_SECTION_CHIEF]: [
        'Provide resources and services',
        'Manage facilities',
        'Arrange transportation',
        'Supply equipment and materials',
      ],
      [ICSRole.FINANCE_SECTION_CHIEF]: [
        'Track incident costs',
        'Process procurement',
        'Manage compensation claims',
        'Prepare financial reports',
      ],
      // Add more as needed...
    } as any;

    return responsibilities[role] || ['Role-specific responsibilities'];
  }

  private getExpandedPositions(role: ICSRole): ICSPosition[] {
    // Define which subordinate positions to create when expanding a role
    const expansions: Record<string, ICSRole[]> = {
      [ICSRole.OPERATIONS_SECTION_CHIEF]: [
        ICSRole.STAGING_AREA_MANAGER,
        ICSRole.BRANCH_DIRECTOR,
      ],
      [ICSRole.PLANNING_SECTION_CHIEF]: [
        ICSRole.RESOURCES_UNIT_LEADER,
        ICSRole.SITUATION_UNIT_LEADER,
        ICSRole.DOCUMENTATION_UNIT_LEADER,
      ],
      [ICSRole.LOGISTICS_SECTION_CHIEF]: [
        ICSRole.SUPPLY_UNIT_LEADER,
        ICSRole.FACILITIES_UNIT_LEADER,
        ICSRole.GROUND_SUPPORT_UNIT_LEADER,
        ICSRole.COMMUNICATIONS_UNIT_LEADER,
      ],
      [ICSRole.FINANCE_SECTION_CHIEF]: [
        ICSRole.TIME_UNIT_LEADER,
        ICSRole.PROCUREMENT_UNIT_LEADER,
        ICSRole.COMPENSATION_CLAIMS_UNIT_LEADER,
        ICSRole.COST_UNIT_LEADER,
      ],
    } as any;

    const subordinateRoles = expansions[role] || [];
    return subordinateRoles.map((r) => this.createPosition(r));
  }
}

export class CheckInManager {
  private checkIns: Map<string, CheckInRecord> = new Map();

  async checkIn(
    userId: string,
    location: any,
    status: string,
    assignedRole?: ICSRole
  ): Promise<void> {
    this.checkIns.set(userId, {
      userId,
      checkInTime: new Date(),
      location,
      status,
      lastUpdate: new Date(),
      assignedRole,
    });
  }

  async checkOut(userId: string): Promise<void> {
    this.checkIns.delete(userId);
  }

  async updateStatus(userId: string, status: string, location?: any): Promise<void> {
    const record = this.checkIns.get(userId);
    if (!record) {
      throw new Error(`User not checked in: ${userId}`);
    }

    record.status = status;
    record.lastUpdate = new Date();
    if (location) {
      record.location = location;
    }
  }

  getStatus(userId: string): CheckInRecord | undefined {
    return this.checkIns.get(userId);
  }

  getAllCheckedIn(): CheckInRecord[] {
    return Array.from(this.checkIns.values());
  }

  getByRole(role: ICSRole): CheckInRecord[] {
    return Array.from(this.checkIns.values()).filter(
      (r) => r.assignedRole === role
    );
  }

  getStaleCheckIns(thresholdMinutes: number = 60): CheckInRecord[] {
    const threshold = Date.now() - thresholdMinutes * 60 * 1000;

    return Array.from(this.checkIns.values()).filter(
      (r) => r.lastUpdate.getTime() < threshold
    );
  }
}

interface CheckInRecord {
  userId: string;
  checkInTime: Date;
  location: any;
  status: string;
  lastUpdate: Date;
  assignedRole?: ICSRole;
}

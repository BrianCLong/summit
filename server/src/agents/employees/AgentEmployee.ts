
import { Employee, EmployeeRole, EmployeeScope, AgentStatus, AgentTask, AgentCapability } from './types.ts';

export abstract class AgentEmployee implements Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  scope: EmployeeScope;
  capabilities: string[] = [];
  status: AgentStatus = 'idle';
  supervisorId: string | null = null;
  subordinates: string[] = [];

  protected capabilityMap: Map<string, AgentCapability> = new Map();

  constructor(id: string, name: string, role: EmployeeRole, scope: EmployeeScope) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.scope = scope;
  }

  registerCapability(capability: AgentCapability) {
    this.capabilityMap.set(capability.name, capability);
    this.capabilities.push(capability.name);
  }

  abstract processTask(task: AgentTask): Promise<void>;

  setSupervisor(supervisorId: string) {
    this.supervisorId = supervisorId;
  }

  addSubordinate(subordinateId: string) {
    if (!this.subordinates.includes(subordinateId)) {
      this.subordinates.push(subordinateId);
    }
  }

  protected log(message: string) {
    console.log(`[${this.role.toUpperCase()} - ${this.name}]: ${message}`);
  }
}

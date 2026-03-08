
import { AgentEmployee } from './AgentEmployee.ts';
import { EmployeeRole } from './types.ts';

export class EmployeeRegistry {
  private employees: Map<string, AgentEmployee> = new Map();

  registerEmployee(employee: AgentEmployee) {
    this.employees.set(employee.id, employee);

    // Update supervisor link if exists
    if (employee.supervisorId) {
        const supervisor = this.employees.get(employee.supervisorId);
        if (supervisor) {
            supervisor.addSubordinate(employee.id);
        }
    }
  }

  getEmployee(id: string): AgentEmployee | undefined {
    return this.employees.get(id);
  }

  getEmployeesByRole(role: EmployeeRole): AgentEmployee[] {
    return Array.from(this.employees.values()).filter(e => e.role === role);
  }

  getDirectReports(supervisorId: string): AgentEmployee[] {
      const supervisor = this.getEmployee(supervisorId);
      if (!supervisor) return [];
      return supervisor.subordinates
        .map(id => this.getEmployee(id))
        .filter((e): e is AgentEmployee => e !== undefined);
  }
}

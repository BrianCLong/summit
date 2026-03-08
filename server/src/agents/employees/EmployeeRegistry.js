"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeRegistry = void 0;
class EmployeeRegistry {
    employees = new Map();
    registerEmployee(employee) {
        this.employees.set(employee.id, employee);
        // Update supervisor link if exists
        if (employee.supervisorId) {
            const supervisor = this.employees.get(employee.supervisorId);
            if (supervisor) {
                supervisor.addSubordinate(employee.id);
            }
        }
    }
    getEmployee(id) {
        return this.employees.get(id);
    }
    getEmployeesByRole(role) {
        return Array.from(this.employees.values()).filter(e => e.role === role);
    }
    getDirectReports(supervisorId) {
        const supervisor = this.getEmployee(supervisorId);
        if (!supervisor)
            return [];
        return supervisor.subordinates
            .map(id => this.getEmployee(id))
            .filter((e) => e !== undefined);
    }
}
exports.EmployeeRegistry = EmployeeRegistry;

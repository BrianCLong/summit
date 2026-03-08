"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEmployee = void 0;
class AgentEmployee {
    id;
    name;
    role;
    scope;
    capabilities = [];
    status = 'idle';
    supervisorId = null;
    subordinates = [];
    capabilityMap = new Map();
    constructor(id, name, role, scope) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.scope = scope;
    }
    registerCapability(capability) {
        this.capabilityMap.set(capability.name, capability);
        this.capabilities.push(capability.name);
    }
    setSupervisor(supervisorId) {
        this.supervisorId = supervisorId;
    }
    addSubordinate(subordinateId) {
        if (!this.subordinates.includes(subordinateId)) {
            this.subordinates.push(subordinateId);
        }
    }
    log(message) {
        console.log(`[${this.role.toUpperCase()} - ${this.name}]: ${message}`);
    }
}
exports.AgentEmployee = AgentEmployee;

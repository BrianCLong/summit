"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EmployeeRegistry_js_1 = require("../agents/employees/EmployeeRegistry.js");
const WorkerAgent_js_1 = require("../agents/employees/WorkerAgent.js");
const SupervisorAgent_js_1 = require("../agents/employees/SupervisorAgent.js");
const types_js_1 = require("../agents/employees/types.js");
async function runDemo() {
    console.log('--- Starting Security Operations Demo ---\n');
    const registry = new EmployeeRegistry_js_1.EmployeeRegistry();
    // 1. Create Agents
    const socManager = new SupervisorAgent_js_1.SupervisorAgent('emp-001', 'Alice Manager', types_js_1.EmployeeRole.SOC_MANAGER, 'level_3');
    const triageSpecialist = new WorkerAgent_js_1.WorkerAgent('emp-002', 'Bob Triage', types_js_1.EmployeeRole.TRIAGE_SPECIALIST, 'level_1');
    const forensicAnalyst = new WorkerAgent_js_1.WorkerAgent('emp-003', 'Charlie Forensics', types_js_1.EmployeeRole.FORENSIC_ANALYST, 'level_2');
    // 2. Define Capabilities
    const triageCapability = {
        name: 'triage_alert',
        description: 'Analyze raw alert and classify severity',
        execute: async (input) => {
            console.log(`[CAPABILITY] Triaging alert: ${input.alertId}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
            return { severity: 'high', category: 'malware', confidence: 0.9 };
        }
    };
    const investigateCapability = {
        name: 'investigate_incident',
        description: 'Deep dive into incident artifacts',
        execute: async (input) => {
            console.log(`[CAPABILITY] Investigating artifacts for incident: ${input.incidentId}`);
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate work
            return {
                findings: ['suspicious_ip_connection', 'registry_modification'],
                verdict: 'confirmed_malicious',
                evidence_count: 2
            };
        }
    };
    triageSpecialist.registerCapability(triageCapability);
    forensicAnalyst.registerCapability(investigateCapability);
    // 3. Set up Hierarchy
    triageSpecialist.setSupervisor(socManager.id);
    forensicAnalyst.setSupervisor(socManager.id);
    registry.registerEmployee(socManager);
    registry.registerEmployee(triageSpecialist);
    registry.registerEmployee(forensicAnalyst);
    console.log('--- Organization Chart ---');
    console.log(`${socManager.name} manages:`);
    registry.getDirectReports(socManager.id).forEach(e => console.log(`  - ${e.name} (${e.role})`));
    console.log('--------------------------\n');
    // 4. Simulate Workflow
    // Step A: New Alert comes in
    const alertPayload = { alertId: 'ALERT-2023-999', source: 'Firewall', details: 'Outbound connection to known C2' };
    const triageTask = {
        id: 'task-101',
        type: 'triage',
        description: 'Triage incoming firewall alert',
        payload: alertPayload,
        status: 'pending',
        history: []
    };
    console.log('>>> Step 1: Triage');
    // Manager delegates to Triage Specialist
    await socManager.delegate(triageTask, triageSpecialist);
    if (triageTask.result?.severity === 'high') {
        console.log('\n>>> Step 2: Investigation (High Severity Detected)');
        const investigationTask = {
            id: 'task-102',
            type: 'investigate',
            description: `Investigate confirmed high severity alert ${alertPayload.alertId}`,
            payload: { incidentId: 'INC-555', relatedAlert: triageTask.result },
            status: 'pending',
            history: []
        };
        // Manager delegates to Forensic Analyst
        await socManager.delegate(investigationTask, forensicAnalyst);
    }
    console.log('\n--- Demo Completed ---');
}
runDemo().catch(console.error);

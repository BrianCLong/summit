
import { EmployeeRegistry } from '../agents/employees/EmployeeRegistry.js';
import { WorkerAgent } from '../agents/employees/WorkerAgent.js';
import { SupervisorAgent } from '../agents/employees/SupervisorAgent.js';
import { EmployeeRole, AgentTask, AgentCapability } from '../agents/employees/types.js';

async function runDemo() {
  console.log('--- Starting Security Operations Demo ---\n');

  const registry = new EmployeeRegistry();

  // 1. Create Agents
  const socManager = new SupervisorAgent('emp-001', 'Alice Manager', EmployeeRole.SOC_MANAGER, 'level_3');
  const triageSpecialist = new WorkerAgent('emp-002', 'Bob Triage', EmployeeRole.TRIAGE_SPECIALIST, 'level_1');
  const forensicAnalyst = new WorkerAgent('emp-003', 'Charlie Forensics', EmployeeRole.FORENSIC_ANALYST, 'level_2');

  // 2. Define Capabilities
  const triageCapability: AgentCapability = {
      name: 'triage_alert',
      description: 'Analyze raw alert and classify severity',
      execute: async (input: any) => {
          console.log(`[CAPABILITY] Triaging alert: ${input.alertId}`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
          return { severity: 'high', category: 'malware', confidence: 0.9 };
      }
  };

  const investigateCapability: AgentCapability = {
      name: 'investigate_incident',
      description: 'Deep dive into incident artifacts',
      execute: async (input: any) => {
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
  const triageTask: AgentTask = {
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
      const investigationTask: AgentTask = {
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

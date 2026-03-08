import { Ledger } from '@summit/receipts';

// --- Minimal Runtime Simulation ---

interface Tool {
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
}

class SwitchboardRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
    console.log(`[Registry] Registered tool: ${tool.name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
}

class SwitchboardRuntime {
  registry: SwitchboardRegistry;
  ledger: Ledger;

  constructor() {
    this.registry = new SwitchboardRegistry();
    this.ledger = new Ledger();
    console.log("[Switchboard] Runtime initialized.");
  }

  async run(toolName: string, input: any) {
    console.log(`[Switchboard] Request: Execute '${toolName}' with input:`, input);

    const tool = this.registry.get(toolName);
    if (!tool) {
      console.error(`[Switchboard] Error: Tool '${toolName}' not found.`);
      return;
    }

    const startTime = Date.now();
    let output;
    let status = 'success';
    let error = null;

    try {
      console.log(`[Switchboard] Executing ${toolName}...`);
      output = await tool.execute(input);
    } catch (e) {
      status = 'failure';
      error = e instanceof Error ? e.message : String(e);
      output = { error };
      console.error(`[Switchboard] Execution failed: ${error}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Switchboard] Execution finished in ${duration}ms.`);

    // Create Receipt
    const receiptPayload = {
      tool: toolName,
      input,
      output,
      status,
      duration,
      meta: {
        runtime: "switchboard-quickstart-v1",
        timestamp: new Date().toISOString()
      }
    };

    const receipt = this.ledger.append({
      id: `run-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      actor: 'user-demo',
      action: 'tool-execution',
      payload: receiptPayload
    });

    console.log("[Switchboard] Receipt generated.");
    return receipt;
  }
}

// --- Quickstart Demo ---

async function main() {
  console.log("==========================================");
  console.log("   Switchboard Quickstart Demo (Consumer Wedge)");
  console.log("==========================================\n");

  const runtime = new SwitchboardRuntime();

  // 1. Load a sample tool (Mock MCP Tool)
  runtime.registry.register({
    name: "calculator",
    description: "Performs basic arithmetic operations",
    execute: async (input: { op: string, a: number, b: number }) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      switch (input.op) {
        case 'add': return { result: input.a + input.b };
        case 'sub': return { result: input.a - input.b };
        case 'mul': return { result: input.a * input.b };
        case 'div': return { result: input.a / input.b };
        default: throw new Error(`Unknown operation: ${input.op}`);
      }
    }
  });

  // 2. Run a workflow
  console.log("\n--- Step 1: Running Calculator (Add) ---");
  const receipt1 = await runtime.run("calculator", { op: 'add', a: 10, b: 5 });
  console.log("Receipt 1 Hash:", receipt1?.hash);

  console.log("\n--- Step 2: Running Calculator (Multiply) ---");
  const receipt2 = await runtime.run("calculator", { op: 'mul', a: 10, b: 5 });
  console.log("Receipt 2 Hash:", receipt2?.hash);

  // 3. Verify Ledger Integrity
  console.log("\n--- Step 3: Verifying Ledger Integrity ---");
  const allReceipts = runtime.ledger.getAll();
  console.log(`Total Receipts: ${allReceipts.length}`);

  allReceipts.forEach((r, i) => {
    const isValid = runtime.ledger.verify(r.hash);
    console.log(`Receipt #${i+1} (${r.id}): ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
    console.log(`  > Action: ${r.action}`);
    console.log(`  > Payload: ${JSON.stringify(r.payload)}`);
    console.log(`  > Previous Hash: ${r.previous_hash || 'null'}`);
  });

  console.log("\n==========================================");
  console.log("   Demo Complete.");
  console.log("==========================================");
}

main().catch(console.error);

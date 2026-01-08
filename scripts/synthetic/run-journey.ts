import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Environment Configuration
const API_URL = process.env.API_URL || "http://localhost:3000";
const EMAIL = process.env.SYNTHETIC_USER_EMAIL || "admin@intelgraph.dev";
const PASSWORD = process.env.SYNTHETIC_USER_PASSWORD || "admin";

const results: any = {
  journeys: {},
  latency: {},
  timestamp: new Date().toISOString(),
};

async function run() {
  console.log(`Starting synthetic monitoring on ${API_URL}...`);
  console.log(`User: ${EMAIL}`);

  const client = axios.create({
    baseURL: API_URL,
    validateStatus: () => true, // Don't throw on 4xx/5xx
    headers: {
      "User-Agent": "IntelGraph-Synthetic-Monitor/1.0",
    },
  });

  // State to pass between steps
  let token = "";
  let investigationId = "";
  let userId = "";
  let uploadedFilePath = "";
  let maestroResponse: any = null;

  // Helper for timing and recording
  const measure = async (name: string, fn: () => Promise<any>) => {
    const start = Date.now();
    try {
      console.log(`Running ${name}...`);
      const res = await fn();
      const duration = Date.now() - start;
      results.journeys[name] = { success: true, duration, status: res?.status };
      results.latency[name] = duration;
      console.log(`[PASS] ${name} (${duration}ms)`);
      return res;
    } catch (e: any) {
      const duration = Date.now() - start;
      results.journeys[name] = {
        success: false,
        duration,
        error: e.message,
        status: e.response?.status,
      };
      results.latency[name] = duration;
      console.error(`[FAIL] ${name}: ${e.message}`);
      // Critical steps should stop execution to avoid cascading errors or inconsistent state
      if (name.includes("Login") || name.includes("Create Investigation")) throw e;
      return null;
    }
  };

  try {
    // J-001: Login
    await measure("J-001: Basic Login", async () => {
      const query = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            user { id }
          }
        }
      `;
      const res = await client.post("/graphql", {
        query,
        variables: { email: EMAIL, password: PASSWORD },
      });

      if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
      if (!res.data.data?.login?.token) throw new Error("No token returned");

      token = res.data.data.login.token;
      userId = res.data.data.login.user.id;
      client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return res;
    });

    // J-002-Pre: Create Investigation
    await measure("J-002-Pre: Create Investigation", async () => {
      const query = `
        mutation CreateInv($input: InvestigationInput!) {
          createInvestigation(input: $input) {
            id
          }
        }
      `;
      const res = await client.post("/graphql", {
        query,
        variables: { input: { title: `Synthetic Run ${Date.now()}`, priority: "LOW" } },
      });
      if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
      investigationId = res.data.data.createInvestigation.id;
      return res;
    });

    // J-002: Upload Analysis
    await measure("J-002: Upload Analysis", async () => {
      const csvContent = "source,target,type\nA,B,CONNECTED_TO\nB,C,RELATED_TO";
      const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
      const data = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n--${boundary}--`;

      const res = await client.post("/api/import/csv/analyze", data, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
      });

      if (res.status !== 200)
        throw new Error(`Upload failed: ${res.status} ${JSON.stringify(res.data)}`);
      uploadedFilePath = res.data.filePath;
      return res;
    });

    // J-002: Import Execution
    await measure("J-002: Import Execution", async () => {
      if (!uploadedFilePath) throw new Error("No file path from analysis");
      const mapping = {
        source: "source",
        target: "target",
        type: "type",
        entityType: "ENTITY",
      };
      const res = await client.post("/api/import/csv/import", {
        filePath: uploadedFilePath,
        investigationId,
        mapping,
        dedupeKey: ["source"],
      });
      if (res.status !== 200) throw new Error(`Import failed: ${res.status}`);
      return res;
    });

    // J-003: Graph Queries
    await measure("J-003: Graph Queries", async () => {
      const query = `
        query($invId: ID!) {
          entities(first: 3) { edges { node { id label } } }
          relationships(first: 3) { edges { node { id type } } }
          graphData(investigationId: $invId) { nodeCount edgeCount }
        }
      `;
      const res = await client.post("/graphql", {
        query,
        variables: { invId: investigationId },
      });
      if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));

      // Verify structure
      const data = res.data.data;
      if (!data.entities || !data.relationships || !data.graphData) {
        throw new Error("Missing expected graph data fields");
      }
      return res;
    });

    // J-004: Trigger Maestro Run
    await measure("J-004: Trigger Maestro Run", async () => {
      const res = await client.post("/api/maestro/runs", {
        userId,
        requestText: "Synthetic check: describe the connection between A and B",
      });
      if (res.status !== 200) throw new Error(`Maestro failed: ${res.status}`);
      maestroResponse = res.data;
      return res;
    });

    // J-006: Evaluate Result
    await measure("J-006: Evaluate Result", async () => {
      if (!maestroResponse) throw new Error("No Maestro response from J-004");

      const { run, results: taskResults } = maestroResponse;

      if (!run || !run.id) throw new Error("Maestro response missing run ID");

      // Check for artifacts/results
      if (!taskResults || !Array.isArray(taskResults) || taskResults.length === 0) {
        throw new Error("Maestro run produced no results");
      }

      // Check for success status in task results
      const failedTasks = taskResults.filter((r: any) => r.task && r.task.status === "failed");
      if (failedTasks.length > 0) {
        throw new Error(
          `Maestro tasks failed: ${failedTasks.map((t: any) => t.task.errorMessage).join(", ")}`
        );
      }

      return { status: 200, data: "Verified" };
    });
  } catch (err: any) {
    console.error("Synthetic run failed:", err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup: Delete Investigation
    if (investigationId) {
      try {
        console.log("Cleaning up investigation...");
        const query = `mutation DeleteInv($id: ID!) { deleteInvestigation(id: $id) }`;
        await client.post("/graphql", {
          query,
          variables: { id: investigationId },
        });
        console.log("[PASS] Cleanup");
      } catch (cleanupErr: any) {
        console.error("[FAIL] Cleanup:", cleanupErr.message);
      }
    }

    fs.writeFileSync("synthetic-results.json", JSON.stringify(results, null, 2));
    fs.writeFileSync("synthetic-latency-histogram.json", JSON.stringify(results.latency, null, 2));
  }
}

run();

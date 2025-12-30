import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";

interface TelemetryEvent {
  policy_id: string;
  policy_domain: string;
  decision: "allow" | "deny" | "degrade" | "throttle" | "kill";
  response_profile?: string;
  reason_codes?: string[];
  environment: "dev" | "demo" | "staging" | "prod";
  correlation_id: string;
  timestamp: string;
}

interface AggregatedSignal {
  policy_id: string;
  policy_domain: string;
  environment: string;
  total: number;
  deny: number;
  kill: number;
  throttle: number;
  degrade: number;
  allow: number;
  unique_reason_codes: string[];
}

function aggregateSignals(events: TelemetryEvent[]): AggregatedSignal[] {
  const summary = new Map<string, AggregatedSignal>();

  for (const evt of events) {
    const key = `${evt.policy_id}:${evt.environment}`;
    if (!summary.has(key)) {
      summary.set(key, {
        policy_id: evt.policy_id,
        policy_domain: evt.policy_domain,
        environment: evt.environment,
        total: 0,
        deny: 0,
        kill: 0,
        throttle: 0,
        degrade: 0,
        allow: 0,
        unique_reason_codes: [],
      });
    }
    const agg = summary.get(key)!;
    agg.total += 1;
    agg[evt.decision] += 1;
    if (evt.reason_codes) {
      for (const reason of evt.reason_codes) {
        if (!agg.unique_reason_codes.includes(reason)) {
          agg.unique_reason_codes.push(reason);
        }
      }
    }
  }

  return Array.from(summary.values());
}

async function readTelemetry(filePath: string): Promise<TelemetryEvent[]> {
  const events: TelemetryEvent[] = [];
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      events.push(parsed as TelemetryEvent);
    } catch (err) {
      console.error(`Failed to parse telemetry line: ${trimmed}`);
      throw err;
    }
  }

  return events;
}

function main(): void {
  const input = process.argv[2] ?? "runtime-telemetry.ndjson";
  const output = process.argv[3] ?? "runtime-signal-export.json";
  const resolvedInput = resolve(process.cwd(), input);
  const resolvedOutput = resolve(process.cwd(), output);

  readTelemetry(resolvedInput)
    .then(aggregateSignals)
    .then((signals) => {
      const payload = {
        version: 1,
        generated_at: new Date().toISOString(),
        source: "runtime-enforcement",
        signals,
      };
      writeFileSync(resolvedOutput, JSON.stringify(payload, null, 2));
      console.log(`Exported ${signals.length} aggregated signals to ${resolvedOutput}`);
    })
    .catch((err) => {
      console.error("Signal export failed", err);
      process.exitCode = 1;
    });
}

if (require.main === module) {
  main();
}

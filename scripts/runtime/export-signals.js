"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_readline_1 = require("node:readline");
const node_path_1 = require("node:path");
function aggregateSignals(events) {
    const summary = new Map();
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
        const agg = summary.get(key);
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
async function readTelemetry(filePath) {
    const events = [];
    const rl = (0, node_readline_1.createInterface)({
        input: (0, node_fs_1.createReadStream)(filePath),
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        try {
            const parsed = JSON.parse(trimmed);
            events.push(parsed);
        }
        catch (err) {
            console.error(`Failed to parse telemetry line: ${trimmed}`);
            throw err;
        }
    }
    return events;
}
function main() {
    const input = process.argv[2] ?? "runtime-telemetry.ndjson";
    const output = process.argv[3] ?? "runtime-signal-export.json";
    const resolvedInput = (0, node_path_1.resolve)(process.cwd(), input);
    const resolvedOutput = (0, node_path_1.resolve)(process.cwd(), output);
    readTelemetry(resolvedInput)
        .then(aggregateSignals)
        .then((signals) => {
        const payload = {
            version: 1,
            generated_at: new Date().toISOString(),
            source: "runtime-enforcement",
            signals,
        };
        (0, node_fs_1.writeFileSync)(resolvedOutput, JSON.stringify(payload, null, 2));
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

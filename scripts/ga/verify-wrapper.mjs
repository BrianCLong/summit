#!/usr/bin/env node
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import util from 'node:util';

// Mapping of commands to Trace Events
const STEPS = [
    {
        name: "typecheck",
        cmd: "pnpm",
        args: ["typecheck"],
        control: "SA-001", // Static Analysis
        desc: "TypeScript compilation check"
    },
    {
        name: "lint",
        cmd: "pnpm",
        args: ["lint"],
        control: "SA-002", // Linting
        desc: "ESLint and formatting check"
    },
    {
        name: "build",
        cmd: "pnpm",
        args: ["build"],
        control: "SCI-001", // Deterministic Build (partially)
        desc: "Build process"
    },
    {
        name: "test:unit",
        cmd: "pnpm",
        args: ["--filter", "intelgraph-server", "test:unit"],
        control: "TEST-001", // Unit Tests
        desc: "Server unit tests"
    },
    {
        name: "smoke",
        cmd: "pnpm",
        args: ["ga:smoke"],
        control: "TEST-002", // Smoke Tests
        desc: "Smoke test verification"
    }
];

// Spawn function that streams output
function spawnStep(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function run() {
    const traceEvents = [];
    const args = process.argv.slice(2);

    // Check for --trace=json:path
    let tracePath = null;
    const traceArg = args.find(a => a.startsWith('--trace=json:'));
    if (traceArg) {
        tracePath = traceArg.split('json:')[1];
    }

    console.log("Starting Traced Verify...");

    let overallSuccess = true;

    for (const step of STEPS) {
        const start = new Date().toISOString();
        console.log(`> Running ${step.name}...`);

        try {
            await spawnStep(step.cmd, step.args);

            traceEvents.push({
                name: step.name,
                cmd: `${step.cmd} ${step.args.join(' ')}`,
                timestamp: start,
                duration_ms: Date.now() - new Date(start).getTime(),
                status: "pass",
                ok: true,
                tags: [step.control, "verify", step.name]
            });
        } catch (error) {
            console.error(`X Failed ${step.name}`);

            traceEvents.push({
                name: step.name,
                cmd: `${step.cmd} ${step.args.join(' ')}`,
                timestamp: start,
                duration_ms: Date.now() - new Date(start).getTime(),
                status: "fail",
                ok: false,
                error: error.message,
                tags: [step.control, "verify", step.name]
            });
            overallSuccess = false;
        }

        // Write incrementally so we have evidence even if it crashes/times out
        if (tracePath) {
            try {
                // Ensure directory exists
                const dir = tracePath.split('/').slice(0, -1).join('/');
                if (dir && !fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                console.log(`Writing trace update to ${tracePath}`);
                fs.writeFileSync(tracePath, JSON.stringify(traceEvents, null, 2));
            } catch (err) {
                console.error("Failed to write trace file:", err);
            }
        }

        if (!overallSuccess) {
            // Fail fast behavior
            console.error("Stopping due to failure.");
            process.exit(1);
        }
    }

    if (!overallSuccess) {
        process.exit(1);
    }
}

run();

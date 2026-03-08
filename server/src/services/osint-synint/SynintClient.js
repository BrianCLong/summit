"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynintClient = void 0;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:timers/promises");
class SynintClient {
    cfg;
    constructor(cfg) {
        // Fill defaults
        this.cfg = {
            mode: cfg.mode,
            baseUrl: cfg.baseUrl ?? "http://localhost:8080",
            httpTimeoutMs: cfg.httpTimeoutMs ?? 120_000,
            pythonBin: cfg.pythonBin ?? "python3",
            cliEntrypoint: cfg.cliEntrypoint ?? "main.py",
            cliArgsPrefix: cfg.cliArgsPrefix ?? [],
            maxConcurrency: cfg.maxConcurrency ?? 2,
            retry: cfg.retry ?? { attempts: 2, backoffMs: 750 },
        };
    }
    async runSweep(target) {
        const { attempts, backoffMs } = this.cfg.retry;
        let lastErr;
        for (let i = 0; i <= attempts; i++) {
            try {
                if (this.cfg.mode === "http")
                    return await this.runSweepHttp(target);
                return await this.runSweepCli(target);
            }
            catch (err) {
                lastErr = err;
                if (i < attempts)
                    await (0, promises_1.setTimeout)(backoffMs * Math.max(1, i + 1));
            }
        }
        throw lastErr;
    }
    async runSweepHttp(target) {
        const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/sweep`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.cfg.httpTimeoutMs);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ target }),
                signal: ctrl.signal,
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`SYNINT HTTP ${res.status}: ${text.slice(0, 300)}`);
            }
            const data = (await res.json());
            return this.validateSweepResult(data, target);
        }
        finally {
            clearTimeout(t);
        }
    }
    async runSweepCli(target) {
        const args = [
            ...this.cfg.cliArgsPrefix,
            this.cfg.cliEntrypoint,
            "--target",
            target,
            "--json",
        ];
        const child = (0, node_child_process_1.spawn)(this.cfg.pythonBin, args, {
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
        });
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", (d) => stdout.push(Buffer.from(d)));
        child.stderr.on("data", (d) => stderr.push(Buffer.from(d)));
        const exitCode = await new Promise((resolve, reject) => {
            child.on("error", reject);
            child.on("close", resolve);
        });
        const out = Buffer.concat(stdout).toString("utf8").trim();
        const err = Buffer.concat(stderr).toString("utf8").trim();
        if (exitCode !== 0) {
            throw new Error(`SYNINT CLI exit ${exitCode}: ${err.slice(0, 600)}`);
        }
        let parsed;
        try {
            parsed = JSON.parse(out);
        }
        catch {
            throw new Error(`SYNINT CLI returned non-JSON. stderr=${err.slice(0, 300)} stdout=${out.slice(0, 300)}`);
        }
        return this.validateSweepResult(parsed, target);
    }
    validateSweepResult(data, target) {
        if (!data || typeof data !== "object")
            throw new Error("Invalid SYNINT result: not an object");
        if (!data.target)
            data.target = target;
        if (!data.startedAt)
            data.startedAt = new Date().toISOString();
        if (!data.completedAt)
            data.completedAt = new Date().toISOString();
        if (!Array.isArray(data.agents))
            data.agents = [];
        return data;
    }
}
exports.SynintClient = SynintClient;

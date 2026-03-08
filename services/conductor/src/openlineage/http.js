"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ajv_1 = __importDefault(require("ajv"));
const pg_1 = require("pg");
const r = (0, express_1.Router)();
const ajv = new ajv_1.default({ allErrors: true });
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
// (For brevity we assume schema loaded at startup)
r.post('/openlineage', async (req, res) => {
    const ev = req.body;
    // validate(ev) ... (omitted), then store
    await pg.query(`INSERT INTO openlineage_events(run_id, step_id, event_time, event_type, payload)
                  VALUES ($1,$2,$3,$4,$5)`, [
        ev?.run?.facets?.runId,
        ev?.job?.facets?.stepId,
        ev.eventTime,
        ev.eventType,
        ev,
    ]);
    res.status(202).json({ ok: true });
});
exports.default = r;

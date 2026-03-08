"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const router = express_1.default.Router();
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
router.get('/:runbook/:stepId', async (req, res) => {
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    const { runbook, stepId } = req.params;
    const send = async () => {
        const { rows } = await pg.query('SELECT variant_key AS key, alpha, beta, reward_sum, pulls FROM bandit_state WHERE runbook=$1 AND step_id=$2', [runbook, stepId]);
        res.write(`data: ${JSON.stringify(rows)}

`);
    };
    const t = setInterval(send, 3000);
    req.on('close', () => clearInterval(t));
    await send();
});
exports.default = router;

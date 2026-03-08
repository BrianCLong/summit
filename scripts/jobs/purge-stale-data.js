"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const pg_1 = require("pg");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const dotenv_1 = __importDefault(require("dotenv"));
const purgeStaleData_js_1 = require("../../server/src/jobs/purgeStaleData.js");
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
function getArgValue(args, flag) {
    const index = args.indexOf(flag);
    if (index === -1 || index === args.length - 1)
        return undefined;
    return args[index + 1];
}
function filterTargets(targets, selector) {
    if (!selector)
        return targets;
    return targets.filter((target) => target.name === selector || target.table === selector);
}
async function run() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--apply');
    const maxBatch = parseInt(getArgValue(args, '--max-batch') || '0', 10);
    const onlyTarget = getArgValue(args, '--only');
    const targets = filterTargets(purgeStaleData_js_1.defaultPurgeTargets, onlyTarget);
    if (!targets.length) {
        console.error(`No purge targets matched selector: ${onlyTarget}`);
        process.exit(1);
    }
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('Missing POSTGRES_URL or DATABASE_URL; refusing to run purge job');
        process.exit(1);
    }
    const client = new pg_1.Client({ connectionString });
    await client.connect();
    const options = {
        dryRun,
        maxBatchSize: maxBatch > 0 ? maxBatch : undefined,
    };
    try {
        for (const target of targets) {
            const result = await (0, purgeStaleData_js_1.purgeTarget)(client, target, options);
            const summary = result.action === 'delete'
                ? `${result.deleted ?? 0} rows deleted`
                : `${result.anonymized ?? 0} rows anonymized`;
            console.log(`[purge:${target.name}] dryRun=${result.dryRun} matched=${result.matched} ${summary}${result.notes ? ` notes="${result.notes}"` : ''}`);
        }
    }
    finally {
        await client.end();
    }
}
const isMain = process.argv[1] === (0, node_url_1.fileURLToPath)(import.meta.url);
if (isMain) {
    run().catch((error) => {
        console.error('Purge job failed', error);
        process.exit(1);
    });
}

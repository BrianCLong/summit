import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, '../../config/execution_governor.yml');
const SCORECARD_PATH = path.resolve(__dirname, '../../artifacts/execution/scorecard.json');
const CHECKPOINT_PATH = path.resolve(__dirname, '../../artifacts/execution/checkpoint.json');

interface Config {
  thresholds: {
    month_1: { lois_signed: number };
    month_3: { mrr: number };
    month_6: { mrr: number };
    month_9: { mrr: number };
    month_12: { arr_run_rate: number };
  }
}

function loadConfig(): Config {
    return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as Config;
}

function loadScorecard() {
    if (!fs.existsSync(SCORECARD_PATH)) {
        console.error("Scorecard not found. Run scorecard script first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(SCORECARD_PATH, 'utf8'));
}

function evaluate(config: Config, scorecard: any) {
    const sales = scorecard.sales || {};
    const t = config.thresholds;

    const checks = {
        month_1_lois: {
            target: t.month_1.lois_signed,
            actual: sales.loi_signed || 0,
            status: (sales.loi_signed || 0) >= t.month_1.lois_signed ? 'PASS' : 'FAIL'
        },
        month_3_mrr: {
             target: t.month_3.mrr,
             actual: sales.revenue_collected || 0,
             status: (sales.revenue_collected || 0) >= t.month_3.mrr ? 'PASS' : 'FAIL'
        },
         month_6_mrr: {
             target: t.month_6.mrr,
             actual: sales.revenue_collected || 0,
             status: (sales.revenue_collected || 0) >= t.month_6.mrr ? 'PASS' : 'FAIL'
        },
        month_9_mrr: {
            target: t.month_9.mrr,
            actual: sales.revenue_collected || 0,
            status: (sales.revenue_collected || 0) >= t.month_9.mrr ? 'PASS' : 'FAIL'
        },
        month_12_arr: {
            target: t.month_12.arr_run_rate,
            actual: (sales.revenue_collected || 0) * 12, // simple projection
            status: ((sales.revenue_collected || 0) * 12) >= t.month_12.arr_run_rate ? 'PASS' : 'FAIL'
        }
    };

    return checks;
}

function sortKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortKeys);
    }
    const sortedObj: any = {};
    Object.keys(obj).sort().forEach(key => {
        sortedObj[key] = sortKeys(obj[key]);
    });
    return sortedObj;
}

function main() {
    const config = loadConfig();
    const scorecard = loadScorecard();

    const evaluation = evaluate(config, scorecard);

    const output = {
        scorecard_week: scorecard.week_of,
        evaluation: evaluation
    };

    // Deterministic output
    const sortedOutput = sortKeys(output);

    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(sortedOutput, null, 2));
    console.log(`Checkpoint written to ${CHECKPOINT_PATH}`);

    console.log("Evaluation Summary:");
    for (const [key, val] of Object.entries(evaluation)) {
        // Use standard console colors if supported, or just text
        const statusStr = val.status;
        console.log(`${key}: Target ${val.target}, Actual ${val.actual} -> ${statusStr}`);
    }

    const failures = Object.values(evaluation).filter(v => v.status === 'FAIL');
    if (failures.length > 0) {
        console.log("\nACTION REQUIRED: One or more thresholds are not met.");
        console.log("Check Runbook: docs/ops/runbooks/kill-switch.md");
        // Exit code 0 because this is a report, not a CI blocker yet (unless configured to be)
        // Plan says "Emit ... print messages". Doesn't strictly say "Fail build".
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

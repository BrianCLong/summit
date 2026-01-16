import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface LedgerEntry {
  action_id: string;
  trigger_id: string;
  inputs_hash: string;
  policy_hash: string;
  actor: string;
  action_type: string;
  outcome: string;
  artifacts: any;
  timestamp: string;
}

const LEDGER_DIR = path.join(process.cwd(), 'artifacts/autonomy/ledger');

function calculateHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

async function main() {
    const args = process.argv.slice(2);

    // Simple arg parsing
    const getArg = (name: string) => {
        const arg = args.find(a => a.startsWith(`--${name}=`));
        return arg ? arg.split('=')[1] : null;
    };

    const triggerId = getArg('trigger');
    const actionType = getArg('action');
    const outcome = getArg('outcome');
    const detailsFile = getArg('details');
    const policyFile = path.join(process.cwd(), 'docs/autonomy/autonomy_policy.yml');

    if (!triggerId || !actionType || !outcome) {
        console.error('Usage: tsx scripts/autonomy/write_action_ledger.ts --trigger=<id> --action=<type> --outcome=<status> [--details=<json_file>]');
        process.exit(1);
    }

    if (!fs.existsSync(LEDGER_DIR)) {
        fs.mkdirSync(LEDGER_DIR, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const ledgerFile = path.join(LEDGER_DIR, `${date}.json`);

    let ledger: LedgerEntry[] = [];
    if (fs.existsSync(ledgerFile)) {
        ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
    }

    let artifacts = {};
    let inputsHash = '';

    if (detailsFile && fs.existsSync(detailsFile)) {
        artifacts = JSON.parse(fs.readFileSync(detailsFile, 'utf8'));
        inputsHash = calculateHash(detailsFile);
    }

    const entry: LedgerEntry = {
        action_id: uuidv4(),
        trigger_id: triggerId,
        inputs_hash: inputsHash,
        policy_hash: calculateHash(policyFile),
        actor: process.env.GITHUB_ACTOR || 'autonomy-bot',
        action_type: actionType,
        outcome: outcome,
        artifacts: artifacts,
        timestamp: new Date().toISOString()
    };

    ledger.push(entry);
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2));

    console.log(`Ledger entry written to ${ledgerFile}`);
    console.log(JSON.stringify(entry, null, 2));
}

main();

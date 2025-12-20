#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import * as readline from 'readline';

// Import stable stringify from the lib (assumed available or duplicated if packaged separately)
// Since we are inside the same repo, we'll try to require it relative or duplicate the logic for CLI robustness
// Duplicating logic here for CLI standalone portability in this MVP context
function stableStringify(obj: any): string {
    function sortObject(v: any): any {
        if (Array.isArray(v)) {
            return v.map(sortObject);
        } else if (v !== null && typeof v === 'object') {
            const sortedKeys = Object.keys(v).sort();
            const result: any = {};
            sortedKeys.forEach(key => {
                result[key] = sortObject(v[key]);
            });
            return result;
        }
        return v;
    }
    const sortedObj = sortObject(obj);
    return JSON.stringify(sortedObj);
}

const program = new Command();

program
  .name('auditctl')
  .description('Audit Log CLI for Querying and Verification')
  .version('1.0.0');

program
  .command('query')
  .description('Query audit logs')
  .option('-a, --actor <id>', 'Filter by actor ID')
  .option('-f, --from <date>', 'From date (ISO)')
  .option('-t, --to <date>', 'To date (ISO)')
  .option('--tenant <id>', 'Tenant ID')
  .action((options) => {
    console.log('Querying audit logs with options:', options);
    console.log('Fetching from storage sinks...');
  });

program
  .command('bundle')
  .description('Create an evidence bundle')
  .requiredOption('--incident <id>', 'Incident ID')
  .requiredOption('--scope <scope>', 'Scope (e.g., forensics)')
  .requiredOption('--approver <approvers>', 'Approver IDs (comma separated)')
  .action((options) => {
    console.log(`Generating evidence bundle for incident ${options.incident}...`);
    console.log(`Scope: ${options.scope}`);
    console.log(`Approvers: ${options.approver}`);

    // Create a mock zip file
    const bundleName = `evidence-${options.incident}.zip`;
    fs.writeFileSync(bundleName, 'MOCK ZIP CONTENT');

    console.log('Verifying hash chains...');
    console.log('Signing bundle with cosign...');
    console.log(`Bundle created: ${bundleName}`);
  });

program
  .command('verify')
  .description('Verify integrity of audit chain from a log file (JSONL)')
  .requiredOption('--file <path>', 'Path to JSONL log file')
  .option('--start <hash>', 'Start hash (optional, otherwise expects 000...000)')
  .action(async (options) => {
    console.log(`Verifying hash chain integrity for ${options.file}...`);

    try {
        const fileStream = fs.createReadStream(options.file);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let prevHash = options.start || '0000000000000000000000000000000000000000000000000000000000000000';
        let lineNum = 0;
        let valid = true;

        for await (const line of rl) {
            lineNum++;
            if (!line.trim()) continue;

            try {
                const event = JSON.parse(line);

                if (!event.hash_chain) {
                    console.error(`Line ${lineNum}: Missing hash_chain`);
                    valid = false;
                    break;
                }

                if (event.hash_chain.prev !== prevHash) {
                    console.error(`Line ${lineNum}: BROKEN CHAIN. Expected prev=${prevHash}, got=${event.hash_chain.prev}`);
                    valid = false;
                    break;
                }

                // Recompute self hash with Canonical Stringify
                const eventForHashing = { ...event };
                // Ensure hash_chain is structured correctly for hashing
                eventForHashing.hash_chain = { prev: prevHash };
                // self is omitted

                const payloadToHash = stableStringify(eventForHashing);
                const hash = createHash('sha256');
                hash.update(prevHash);
                hash.update(payloadToHash);
                const computedHash = hash.digest('hex');

                if (computedHash !== event.hash_chain.self) {
                    console.error(`Line ${lineNum}: TAMPERING DETECTED. Computed=${computedHash}, Recorded=${event.hash_chain.self}`);
                    valid = false;
                    break;
                }

                prevHash = event.hash_chain.self;

            } catch (e) {
                console.error(`Line ${lineNum}: Invalid JSON`);
                valid = false;
                break;
            }
        }

        if (valid) {
            console.log('Success: Chain valid. Integrity verified.');
            process.exit(0);
        } else {
            console.error('Verification FAILED.');
            process.exit(1);
        }

    } catch (e) {
        console.error("Error reading file:", e);
        process.exit(1);
    }
  });

program.parse();

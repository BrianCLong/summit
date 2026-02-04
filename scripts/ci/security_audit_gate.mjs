import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';

// Configuration
const AUDIT_TIMEOUT_MS = 300000; // 5 minutes
const WAIVERS_FILE = '.github/security-waivers.yml';
const AUDIT_CMD = 'pnpm';
const AUDIT_ARGS = ['audit', '--json', '--audit-level', 'high', '--prod', '--no-optional'];

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function loadWaivers() {
    if (!existsSync(WAIVERS_FILE)) {
        return [];
    }
    try {
        const content = await readFile(WAIVERS_FILE, 'utf8');
        const parsed = yaml.load(content);
        return parsed?.waivers || [];
    } catch (error) {
        console.error(`${RED}Failed to parse waivers file: ${error.message}${RESET}`);
        // If waivers file exists but is invalid, fail safe
        throw error;
    }
}

function isWaived(advisory, waivers) {
    const now = new Date();

    // Find matching waiver
    const waiver = waivers.find(w =>
        w.package === advisory.module_name &&
        (w.advisory_id === advisory.github_advisory_id || w.advisory_id === advisory.cwe || w.advisory_id === advisory.id?.toString())
    );

    if (!waiver) return { waived: false };

    // Check expiry
    if (waiver.expires && new Date(waiver.expires) < now) {
        return { waived: false, reason: 'Expired', waiver };
    }

    return { waived: true, waiver };
}

async function runAudit() {
    console.log(`${BOLD}🛡️  Running Security Audit...${RESET}`);
    console.log(`Command: ${AUDIT_CMD} ${AUDIT_ARGS.join(' ')}`);
    console.log(`Timeout: ${AUDIT_TIMEOUT_MS / 1000}s`);

    return new Promise((resolve, reject) => {
        const child = spawn(AUDIT_CMD, AUDIT_ARGS, {
            shell: false,
            timeout: AUDIT_TIMEOUT_MS
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chuck => { stdout += chuck; });
        child.stderr.on('data', chuck => { stderr += chuck; });

        child.on('close', (code, signal) => {
            if (signal === 'SIGTERM' || signal === 'SIGKILL') {
                return reject(new Error('Audit command timed out'));
            }
            resolve({ code, stdout, stderr });
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        const waivers = await loadWaivers();
        if (waivers.length > 0) {
            console.log(`${YELLOW}Loaded ${waivers.length} active waivers.${RESET}`);
        }

        const { code, stdout, stderr } = await runAudit();

        // Attempt parse JSON
        let auditReport;
        try {
            const jsonStart = stdout.indexOf('{');
            if (jsonStart === -1) {
                if (code !== 0) {
                    console.error(`${RED}Audit failed without JSON output:${RESET}`);
                    console.error(stderr || stdout);
                    return false;
                }
                console.log(`${GREEN}✅ No vulnerabilities found (clean output).${RESET}`);
                return true;
            }

            const jsonStr = stdout.slice(jsonStart);
            auditReport = JSON.parse(jsonStr);
        } catch (e) {
            console.error(`${RED}Failed to parse audit JSON output.${RESET}`);
            console.error(stderr || stdout);
            return false;
        }

        if (!auditReport.advisories && !auditReport.vulnerabilities) {
            if (auditReport.metadata && auditReport.metadata.vulnerabilities &&
                (auditReport.metadata.vulnerabilities.high === 0 && auditReport.metadata.vulnerabilities.critical === 0)) {
                console.log(`${GREEN}✅ No Critical/High vulnerabilities found.${RESET}`);
                return true;
            }
        }

        const advisories = Object.values(auditReport.advisories || {});
        const criticalHigh = advisories.filter(a =>
            a.severity === 'high' || a.severity === 'critical'
        );

        if (criticalHigh.length === 0) {
            console.log(`${GREEN}✅ No Critical/High vulnerabilities found.${RESET}`);
            return true;
        }

        console.log(`\n${BOLD}${RED}Found ${criticalHigh.length} Critical/High vulnerabilities:${RESET}\n`);

        let failureCount = 0;
        console.log(`${BOLD}${'Severity'.padEnd(10)} | ${'Package'.padEnd(20)} | ${'Status'.padEnd(15)} | ${'Issue'}${RESET}`);
        console.log('-'.repeat(80));

        for (const vuln of criticalHigh) {
            const { waived, reason, waiver } = isWaived(vuln, waivers);
            const severityColor = vuln.severity === 'critical' ? RED : YELLOW;

            let status = `${RED}Action Req${RESET}`;
            if (waived) status = `${GREEN}Waived${RESET}`;
            else if (reason === 'Expired') status = `${RED}Expired${RESET}`;

            console.log(
                `${severityColor}${vuln.severity.padEnd(10)}${RESET} | ` +
                `${vuln.module_name.padEnd(20)} | ` +
                `${status.padEnd(24)} | ` + 
                `${vuln.title}`
            );

            if (!waived) {
                if (reason === 'Expired') {
                    console.log(`   ${RED}Waiver expired on ${waiver.expires}. Rationale: ${waiver.rationale}${RESET}`);
                }
                console.log(`   ${BOLD}Path:${RESET} ${vuln.findings?.[0]?.paths?.[0] || 'Unknown'}`);
                console.log(`   ${BOLD}Fix:${RESET} ${vuln.url}`);
                failureCount++;
            } else {
                console.log(`   ${YELLOW}Waived until ${waiver.expires}: ${waiver.rationale}${RESET}`);
            }
            console.log('');
        }

        if (failureCount > 0) {
            console.log(`${RED}❌ Audit failed with ${failureCount} unwaived Critical/High vulnerabilities.${RESET}`);
            return false;
        } else {
            console.log(`${GREEN}✅ All vulnerabilities are waived or addressed.${RESET}`);
            return true;
        }

    } catch (err) {
        console.error(`${RED}Unexpected fatal error:${RESET}`, err);
        throw err;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().then(success => process.exit(success ? 0 : 1)).catch(() => process.exit(1));
}

export { main, loadWaivers, isWaived, runAudit };

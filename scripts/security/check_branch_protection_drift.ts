
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ============================================================================
// Types
// ============================================================================

interface DriftReport {
    timestamp: string;
    repo: string;
    snapshotFile: string | null;
    driftDetected: boolean;
    errors: string[];
    differences: {
        resource: string; // e.g., "Ruleset: Main Protection" or "Classic Branch Protection"
        expected: any;
        actual: any;
    }[];
}

interface Snapshot {
    metadata: {
        timestamp: string;
        repo: string;
        generatorVersion: string;
    };
    rulesets?: any[];
    classic_protection?: any;
}

// ============================================================================
// Configuration
// ============================================================================

const SNAPSHOTS_DIR = 'docs/security/branch_protection_snapshots';
const REPORT_FILE = '.tmp/branch_protection_drift_report.json';
const GITHUB_API_BASE = 'https://api.github.com';

// ============================================================================
// Helpers
// ============================================================================

function getRepoInfo(): { owner: string; repo: string } {
    try {
        const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
        // Support SSH and HTTPS
        // SSH: git@github.com:owner/repo.git
        // HTTPS: https://github.com/owner/repo.git
        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
        if (!match) {
            throw new Error(`Could not parse owner/repo from remote URL: ${remoteUrl}`);
        }
        return { owner: match[1], repo: match[2] };
    } catch (error: any) {
        console.error('Failed to determine repo info from git:', error.message);
        process.exit(1);
    }
}

function getAuthHeaders() {
    const token = process.env.BRANCH_PROTECTION_AUDIT_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
        console.warn('⚠️  No BRANCH_PROTECTION_AUDIT_TOKEN or GITHUB_TOKEN set. API calls may fail (403/404).');
        return {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Summit-Branch-Protection-Drift-Detector'
        };
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Summit-Branch-Protection-Drift-Detector'
    };
}

async function fetchGitHub(path: string): Promise<any> {
    const url = `${GITHUB_API_BASE}${path}`;
    const headers = getAuthHeaders();

    const response = await fetch(url, { headers });

    if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
            throw new Error(`API Request Failed (${response.status}): ${response.statusText}. Check permissions/tokens.`);
        }
        throw new Error(`API Request Failed (${response.status}): ${response.statusText}`);
    }

    return response.json();
}

function normalizeJson(data: any): any {
    if (Array.isArray(data)) {
        return data.map(normalizeJson);
    } else if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        const volatileKeys = [
            'id', 'node_id', 'url', 'created_at', 'updated_at',
            'ruleset_id', 'repository_id', 'actor_id', '_links', 'etag'
        ];

        // Sort keys for deterministic comparison
        const sortedKeys = Object.keys(data).sort();

        for (const key of sortedKeys) {
            if (volatileKeys.includes(key)) continue;
            // Also ignore 'enabled' if explicitly false? No, enabled state is important.
            newObj[key] = normalizeJson(data[key]);
        }
        return newObj;
    }
    return data;
}

function getLatestSnapshotFile(): string | null {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return null;

    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.endsWith('.json') && (f.startsWith('rulesets_') || f.startsWith('branch_protection_')))
        .sort()
        .reverse();

    return files.length > 0 ? path.join(SNAPSHOTS_DIR, files[0]) : null;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const { owner, repo } = getRepoInfo();
    console.log(`Repository: ${owner}/${repo}`);

    const report: DriftReport = {
        timestamp: new Date().toISOString(),
        repo: `${owner}/${repo}`,
        snapshotFile: null,
        driftDetected: false,
        errors: [],
        differences: []
    };

    try {
        // 0. Check for Generate Flag
        const args = process.argv.slice(2);
        const generateMode = args.includes('--generate-snapshot') || args.includes('--update-snapshot');

        // 1. Load Snapshot (if not generating)
        let snapshot: Snapshot | null = null;
        let snapshotPath = getLatestSnapshotFile();

        if (!generateMode) {
            if (snapshotPath) {
                console.log(`Loading snapshot: ${snapshotPath}`);
                report.snapshotFile = snapshotPath;
                snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
            } else {
                console.warn('⚠️  No existing snapshots found in docs/security/branch_protection_snapshots/.');
            }
        }

        // 2. Fetch Live Config
        console.log('Fetching live configuration from GitHub...');
        let liveRulesets: any[] = [];
        let liveClassic: any = null;

        try {
            liveRulesets = await fetchGitHub(`/repos/${owner}/${repo}/rulesets`);
            const detailedRulesets = await Promise.all(liveRulesets.map(async (rs: any) => {
                return await fetchGitHub(`/repos/${owner}/${repo}/rulesets/${rs.id}`);
            }));
            liveRulesets = detailedRulesets;
        } catch (e: any) {
            if (!generateMode) report.errors.push(`Failed to fetch rulesets: ${e.message}`);
            else throw e;
        }

        try {
            liveClassic = await fetchGitHub(`/repos/${owner}/${repo}/branches/main/protection`);
        } catch (e: any) {
            if (!e.message.includes('404')) {
                if (!generateMode) report.errors.push(`Failed to fetch classic protection: ${e.message}`);
                else throw e;
            }
        }

        // 3. Generate Snapshot
        if (generateMode) {
            const today = new Date().toISOString().split('T')[0];
            const filename = `branch_protection_main_${today}.json`;
            const filePath = path.join(SNAPSHOTS_DIR, filename);

            const newSnapshot: Snapshot = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    repo: `${owner}/${repo}`,
                    generatorVersion: '1.0.0'
                },
                rulesets: liveRulesets,
                classic_protection: liveClassic
            };

            fs.writeFileSync(filePath, JSON.stringify(newSnapshot, null, 2));
            console.log(`\n✅ Snapshot generated: ${filePath}`);
            process.exit(0);
        }

        // 4. Compare
        if (snapshot) {
            const normSnapshot = normalizeJson(snapshot);
            const normLive = normalizeJson({
                rulesets: liveRulesets,
                classic_protection: liveClassic
            });

            // Compare Classic
            if (JSON.stringify(normSnapshot.classic_protection) !== JSON.stringify(normLive.classic_protection)) {
                report.driftDetected = true;
                report.differences.push({
                    resource: 'Classic Branch Protection',
                    expected: normSnapshot.classic_protection,
                    actual: normLive.classic_protection
                });
                console.error('❌ Drift detected in Classic Branch Protection');
            }

            // Compare Rulesets
            if (JSON.stringify(normSnapshot.rulesets) !== JSON.stringify(normLive.rulesets)) {
                report.driftDetected = true;
                report.differences.push({
                    resource: 'Rulesets',
                    expected: normSnapshot.rulesets,
                    actual: normLive.rulesets
                });
                console.error('❌ Drift detected in Rulesets');
            }

        } else {
            console.log('No snapshot to compare against. Skipping comparison.');
        }

    } catch (error: any) {
        console.error('Fatal error:', error);
        report.errors.push(error.message);
        process.exit(1);
    } finally {
        if (!process.argv.includes('--generate-snapshot') && !process.argv.includes('--update-snapshot')) {
            // Write Report
            const tmpDir = path.dirname(REPORT_FILE);
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
            console.log(`Detailed report written to ${REPORT_FILE}`);
        }
    }

    if (report.driftDetected) {
        console.error('FAILURE: Drift detected between snapshot and live configuration.');
        process.exit(2);
    }

    if (report.errors.length > 0) {
        console.error('WARNING: Errors occurred during check (see report).');
        process.exit(3);
    }

    console.log('SUCCESS: No drift detected.');
}

main();

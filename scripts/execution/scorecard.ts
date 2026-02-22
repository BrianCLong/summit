import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STUB_PATH = path.resolve(__dirname, '../../data/execution/pipeline_stub.json');
const ARTIFACT_PATH = path.resolve(__dirname, '../../artifacts/execution/scorecard.json');

function parseArgs() {
    const args = process.argv.slice(2);
    const weekOfIndex = args.indexOf('--week-of');
    if (weekOfIndex === -1 || weekOfIndex + 1 >= args.length) {
        console.error("Usage: npx tsx scripts/execution/scorecard.ts --week-of YYYY-MM-DD");
        process.exit(1);
    }
    return args[weekOfIndex + 1];
}

function getGitMetrics(startDate: string, endDate: string) {
    try {
        const since = `${startDate}T00:00:00`;
        const until = `${endDate}T23:59:59`;

        // Commits count
        const commitsCmd = `git log --since="${since}" --until="${until}" --oneline | wc -l`;
        const commitsCount = parseInt(execSync(commitsCmd, { encoding: 'utf8' }).trim(), 10) || 0;

        // Merged PRs count (counting merge commits)
        const mergesCmd = `git log --since="${since}" --until="${until}" --merges --oneline | wc -l`;
        const mergedPrsCount = parseInt(execSync(mergesCmd, { encoding: 'utf8' }).trim(), 10) || 0;

        return { commits_count: commitsCount, merged_prs_count: mergedPrsCount };
    } catch (e) {
        console.warn("Failed to get git metrics", e);
        return { commits_count: 0, merged_prs_count: 0 };
    }
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
    const weekOf = parseArgs();

    // Calculate week range
    const start = new Date(weekOf);
    if (isNaN(start.getTime())) {
         console.error("Invalid date format. Use YYYY-MM-DD");
         process.exit(1);
    }
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Load stub data
    if (!fs.existsSync(STUB_PATH)) {
        console.error(`Stub file not found at ${STUB_PATH}`);
        process.exit(1);
    }
    const stubData = JSON.parse(fs.readFileSync(STUB_PATH, 'utf8'));
    const weekData = stubData.weeks[weekOf];

    if (!weekData) {
        console.error(`No data found in stub for week ${weekOf}`);
        process.exit(1);
    }

    const gitMetrics = getGitMetrics(startDateStr, endDateStr);

    const scorecard = {
        week_of: weekOf,
        git: gitMetrics,
        sales: weekData.sales,
        hiring: weekData.hiring,
        ship: weekData.ship
    };

    // Deterministic stringify (sort keys)
    const sortedScorecard = sortKeys(scorecard);
    const jsonOutput = JSON.stringify(sortedScorecard, null, 2);

    fs.writeFileSync(ARTIFACT_PATH, jsonOutput);
    console.log(`Scorecard written to ${ARTIFACT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

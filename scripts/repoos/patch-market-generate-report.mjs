#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');

import { formatOperatorJson, formatOperatorMarkdown } from '../../services/repoos/patch-market-formatter.mjs';

async function main() {
    const inputFile = process.argv[2];

    if (!inputFile) {
        throw new Error("Input file argument is required");
    }

    const resolvedInput = path.resolve(repoRoot, inputFile);
    const inputContent = await fs.readFile(resolvedInput, 'utf-8');
    const queueData = JSON.parse(inputContent);

    const timestamp = queueData.timestamp || new Date().toISOString();
    const dateOnly = timestamp.split('T')[0];

    const outputJson = path.join(repoRoot, '.repoos/patch-market', `operator-report-${dateOnly}.json`);
    const outputMd = path.join(repoRoot, '.repoos/patch-market', `operator-report-${dateOnly}.md`);

    const jsonReport = formatOperatorJson(queueData, timestamp);
    const mdReport = formatOperatorMarkdown(jsonReport);

    await fs.mkdir(path.dirname(outputJson), { recursive: true });
    await fs.writeFile(outputJson, JSON.stringify(jsonReport, null, 2));
    await fs.writeFile(outputMd, mdReport);

    console.log(`JSON report: ${outputJson}`);
    console.log(`Markdown report: ${outputMd}`);
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});

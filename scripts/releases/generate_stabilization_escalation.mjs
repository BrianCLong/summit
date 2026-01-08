import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../');
const SLA_FILE = path.join(REPO_ROOT, 'docs/releases/STABILIZATION_SLA.yml');
const WORKSHEET_FILE = path.join(REPO_ROOT, 'docs/releases/issuance_worksheet.csv');
const OUTPUT_DIR = path.join(REPO_ROOT, 'artifacts/stabilization');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'escalation.md');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'escalation.json');

function parseSLA(content) {
  const lines = content.split('\n');
  const sla = {};
  const tiers = {};
  let section = '';

  for (const line of lines) {
    if (line.startsWith('sla:')) { section = 'sla'; continue; }
    if (line.startsWith('escalation_tiers:')) { section = 'tiers'; continue; }
    if (line.startsWith('rules:')) { section = 'rules'; continue; }

    if (section === 'sla' && line.trim().match(/^P\d:/)) {
        const match = line.trim().match(/^(P\d):.*days:\s*(\d+)/);
        if (match) sla[match[1]] = parseInt(match[2]);
    }
    if (section === 'tiers' && line.trim().match(/^T\d:/)) {
        const match = line.trim().match(/^(T\d):\s*"(.*)"/);
        if (match) tiers[match[1]] = match[2];
    }
  }
  return { sla, tiers };
}

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]?.trim() || '');
    return row;
  });
}

function calculateDueDays(targetDate) {
    if (!targetDate) return -999;
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function determineTier(dueDays, hasMissingInfo) {
    if (hasMissingInfo) return 'T3';
    if (dueDays > 2) return 'T0';
    if (dueDays >= 0 && dueDays <= 2) return 'T1';
    if (dueDays >= -7 && dueDays < 0) return 'T2';
    if (dueDays < -7) return 'T3';
    return 'T0';
}

function generateReport() {
    if (!fs.existsSync(SLA_FILE)) {
        console.error('SLA file not found');
        process.exit(1);
    }
    if (!fs.existsSync(WORKSHEET_FILE)) {
        console.error('Worksheet file not found');
        process.exit(1);
    }

    const slaContent = fs.readFileSync(SLA_FILE, 'utf8');
    const { sla, tiers } = parseSLA(slaContent);

    const worksheetContent = fs.readFileSync(WORKSHEET_FILE, 'utf8');
    const items = parseCSV(worksheetContent);

    const escalatedItems = [];
    const blockedUnissued = [];
    const summary = { T0: 0, T1: 0, T2: 0, T3: 0 };
    const byPriority = {};

    items.forEach(item => {
        if (item.Status === 'DONE') return;

        const missingInfo = !item.Owner || !item['Ticket URL'] || !item['Target Date'];
        let dueDays = calculateDueDays(item['Target Date']);

        if (!item['Target Date']) dueDays = -999;

        const tier = determineTier(dueDays, missingInfo);
        summary[tier]++;

        if (!byPriority[item.Priority]) byPriority[item.Priority] = { T0: 0, T1: 0, T2: 0, T3: 0 };
        byPriority[item.Priority][tier]++;

        const escalatedItem = {
            ...item,
            dueDays,
            tier,
            missingInfo
        };

        if (missingInfo) {
            blockedUnissued.push(escalatedItem);
        }

        if (tier !== 'T0') {
            escalatedItems.push(escalatedItem);
        }
    });

    escalatedItems.sort((a, b) => a.dueDays - b.dueDays);

    const reportData = {
        generatedAt: new Date().toISOString(),
        summary,
        byPriority,
        escalatedItems,
        blockedUnissued
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(reportData, null, 2));

    let md = '# Stabilization Escalation Report\n\n';
    md += '**Generated:** ' + new Date().toISOString() + '\n\n';

    md += '## Summary\n\n';
    md += '| Tier | Count | Description |\n';
    md += '|---|---|---|\n';
    Object.keys(tiers).sort().forEach(t => {
        md += '| ' + t + ' | ' + summary[t] + ' | ' + tiers[t] + ' |\n';
    });

    md += '\n## BLOCKED-UNISSUED Items (Action Required)\n\n';
    if (blockedUnissued.length === 0) {
        md += '_None_\n';
    } else {
        md += '| ID | Priority | Missing Fields |\n';
        md += '|---|---|---|\n';
        blockedUnissued.forEach(item => {
            const missing = [];
            if (!item.Owner) missing.push('Owner');
            if (!item['Ticket URL']) missing.push('Ticket');
            if (!item['Target Date']) missing.push('Date');
            md += '| ' + item.ID + ' | ' + item.Priority + ' | ' + missing.join(', ') + ' |\n';
        });
    }

    md += '\n## Top Overdue Items\n\n';
    if (escalatedItems.length === 0) {
        md += '_No escalated items_\n';
    } else {
        md += '| Tier | ID | Priority | Owner | Days Overdue | Ticket |\n';
        md += '|---|---|---|---|---|---|\n';
        escalatedItems.slice(0, 10).forEach(item => {
            const overdue = item.dueDays < 0 ? Math.abs(item.dueDays) : 0;
            md += '| ' + item.tier + ' | ' + item.ID + ' | ' + item.Priority + ' | ' + (item.Owner || 'UNASSIGNED') + ' | ' + overdue + ' | ' + (item['Ticket URL'] || 'N/A') + ' |\n';
        });
    }

    fs.writeFileSync(OUTPUT_MD, md);
    console.log('Report generated: ' + OUTPUT_MD);
}

generateReport();

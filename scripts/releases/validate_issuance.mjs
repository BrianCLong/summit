import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../');
const WORKSHEET_FILE = path.join(REPO_ROOT, 'docs/releases/issuance_worksheet.csv');

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

function validate() {
    if (!fs.existsSync(WORKSHEET_FILE)) {
        console.error('Worksheet file not found');
        process.exit(1);
    }

    const content = fs.readFileSync(WORKSHEET_FILE, 'utf8');
    const items = parseCSV(content);
    let hasErrors = false;

    items.forEach((item, index) => {
        if (item.Status === 'DONE') {
            const missing = [];
            if (!item.Owner) missing.push('Owner');
            if (!item['Ticket URL']) missing.push('Ticket URL');
            if (!item['Evidence Link']) missing.push('Evidence Link');

            if (missing.length > 0) {
                console.error(`Row ${index + 2} (ID: ${item.ID}): DONE status requires ${missing.join(', ')}`);
                hasErrors = true;
            }
        }
    });

    if (hasErrors) {
        process.exit(1);
    } else {
        console.log('Validation successful');
    }
}

validate();

import * as fs from 'fs';
import * as path from 'path';

function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj).sort();
    let str = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) str += ',';
      str += `"${keys[i]}":${stableStringify(obj[keys[i]])}`;
    }
    str += '}';
    return str;
  }
  return JSON.stringify(obj);
}

function detectNonDeterministicFields(obj: any, currentPath: string = ''): string[] {
  let fields: string[] = [];

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      fields = fields.concat(detectNonDeterministicFields(item, `${currentPath}[${idx}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;
      const lowerKey = key.toLowerCase();

      // Heuristic detection for non-deterministic fields
      if (lowerKey.includes('timestamp') ||
          lowerKey.includes('uuid') ||
          lowerKey === 'id' && typeof value === 'string' && value.length > 20) {
        fields.push(fieldPath);
      }

      fields = fields.concat(detectNonDeterministicFields(value, fieldPath));
    }
  }

  return fields;
}

function checkDeterminismDrift() {
  const latestBaselinePath = path.resolve('artifacts/ai-evals/metrics.json');
  let baselineData = {};

  if (fs.existsSync(latestBaselinePath)) {
    try {
      baselineData = JSON.parse(fs.readFileSync(latestBaselinePath, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse baseline data, using empty object.');
    }
  }

  const suspiciousFields = detectNonDeterministicFields(baselineData);

  const output = {
    analyzed_fields_count: Object.keys(baselineData).length,
    baseline_path: 'artifacts/ai-evals/metrics.json',
    has_drift: suspiciousFields.length > 0,
    suspicious_fields: suspiciousFields,
    timestamp_ignored: true
  };

  const formattedOutput = JSON.stringify(JSON.parse(stableStringify(output)), null, 2);
  const outPath = path.resolve('artifacts/monitoring/determinism-drift.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formattedOutput + '\n');

  console.log(`Determinism drift report written to ${outPath}`);
}

checkDeterminismDrift();

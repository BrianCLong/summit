import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ValidationReport } from './types';

export interface AuditEntry {
  timestamp: string;
  planPath: string;
  overallStatus: ValidationReport['overallStatus'];
  results: ValidationReport['results'];
  previousHash: string;
  hash: string;
}

function computeHash(payload: Omit<AuditEntry, 'hash'>): string {
  const normalized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function ensureDirectory(auditPath: string): void {
  const directory = path.dirname(auditPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function readLastEntry(auditPath: string): AuditEntry | undefined {
  if (!fs.existsSync(auditPath)) {
    return undefined;
  }
  const lines = fs
    .readFileSync(auditPath, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean);
  if (lines.length === 0) {
    return undefined;
  }
  const last = lines[lines.length - 1];
  return JSON.parse(last) as AuditEntry;
}

export function appendAuditLog(
  planPath: string,
  report: ValidationReport,
  auditPath = path.join(process.cwd(), 'packages', 'resilience', 'data', 'audit-log.jsonl'),
): AuditEntry {
  ensureDirectory(auditPath);
  const previous = readLastEntry(auditPath);
  const entryWithoutHash: Omit<AuditEntry, 'hash'> = {
    timestamp: new Date().toISOString(),
    planPath: path.resolve(planPath),
    overallStatus: report.overallStatus,
    results: report.results,
    previousHash: previous?.hash ?? 'GENESIS',
  };
  const hash = computeHash(entryWithoutHash);
  const entry: AuditEntry = { ...entryWithoutHash, hash };
  fs.appendFileSync(auditPath, `${JSON.stringify(entry)}\n`, 'utf-8');
  return entry;
}

export function verifyAuditChain(
  auditPath = path.join(process.cwd(), 'packages', 'resilience', 'data', 'audit-log.jsonl'),
): boolean {
  if (!fs.existsSync(auditPath)) {
    return true;
  }
  const lines = fs
    .readFileSync(auditPath, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean);
  let previousHash = 'GENESIS';
  for (const line of lines) {
    const entry = JSON.parse(line) as AuditEntry;
    const { hash, ...rest } = entry;
    const recalculated = computeHash(rest);
    if (hash !== recalculated || rest.previousHash !== previousHash) {
      return false;
    }
    previousHash = hash;
  }
  return true;
}

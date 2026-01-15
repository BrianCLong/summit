export type ReceiptType = 'command' | 'file_write' | 'note';

export interface ReceiptBase {
  id: string;
  type: ReceiptType;
  timestamp: string;
  durationMs?: number;
}

export interface CommandReceipt extends ReceiptBase {
  type: 'command';
  command: string;
  args?: string[];
  exitCode: number;
  stdout?: string;
  stderr?: string;
  shell?: boolean;
}

export interface FileWriteReceipt extends ReceiptBase {
  type: 'file_write';
  path: string;
  bytes: number;
}

export interface NoteReceipt extends ReceiptBase {
  type: 'note';
  message: string;
}

export type Receipt = CommandReceipt | FileWriteReceipt | NoteReceipt;

export interface SessionPaths {
  id: string;
  baseDir: string;
  receiptsPath: string;
  summaryPath: string;
  checklistPath: string;
  planPath: string;
  checklistReportJsonPath: string;
  checklistReportMdPath: string;
}

export interface ChecklistVerifier {
  id: string;
  description?: string;
  command?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  requiredVerifiers: string[];
}

export interface Checklist {
  task: string;
  verifiers: ChecklistVerifier[];
  items: ChecklistItem[];
}

export interface ChecklistVerifierResult {
  id: string;
  status: 'pass' | 'fail' | 'skipped';
  command?: string;
  exitCode?: number | null;
  stdoutPath?: string;
  stderrPath?: string;
  reason?: string;
}

export interface ChecklistItemResult {
  id: string;
  title: string;
  status: 'pass' | 'fail';
  requiredVerifiers: string[];
  failedVerifiers: string[];
}

export interface ChecklistReport {
  task: string;
  sessionId: string;
  status: 'pass' | 'fail';
  generatedAt: string;
  verifierResults: ChecklistVerifierResult[];
  itemResults: ChecklistItemResult[];
}

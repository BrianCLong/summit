import { promises as fs, watch } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentSessionProvider, SessionDetail, SessionListParams, SessionMessage, SessionProjectCount, SessionSummary, ToolCall } from '../types.js';

interface SessionFileIndex {
  id: string;
  filePath: string;
  projectName: string;
}

export class ClaudeCodeHistoryProvider implements AgentSessionProvider {
  private readonly rootPath: string;
  private readonly resumePrefix: string;
  private sessionIndex: Map<string, SessionFileIndex> = new Map();
  private watchers: Map<string, { close: () => void }> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: { rootPath?: string; resumePrefix?: string } = {}) {
    const configuredRoot =
      options.rootPath || process.env.SUMMIT_AGENT_HISTORY_ROOT || '';
    this.rootPath = configuredRoot || path.join(os.homedir(), '.claude');
    this.resumePrefix = options.resumePrefix || 'claude --resume';
  }

  async listSessions(params: SessionListParams) {
    const files = await this.refreshIndex();
    const summaries: SessionSummary[] = [];

    for (const file of files) {
      const detail = await this.parseSessionFile(file);
      if (!detail) continue;
      if (params.project && detail.summary.projectName !== params.project) continue;
      if (params.q) {
        const query = params.q.toLowerCase();
        const matchesQuery =
          detail.summary.title.toLowerCase().includes(query) ||
          detail.messages.some((msg) =>
            msg.contentText.toLowerCase().includes(query),
          );
        if (!matchesQuery) continue;
      }
      summaries.push(detail.summary);
    }

    summaries.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const cursorTime = params.cursor ? new Date(params.cursor).getTime() : null;
    const filtered = cursorTime
      ? summaries.filter(
          (summary) => new Date(summary.updatedAt).getTime() < cursorTime,
        )
      : summaries;
    const limit = params.limit && params.limit > 0 ? params.limit : filtered.length;
    const sliced = filtered.slice(0, limit);
    const nextCursor =
      filtered.length > limit ? filtered[limit - 1]?.updatedAt : undefined;

    return { sessions: sliced, nextCursor };
  }

  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    const file = await this.resolveSessionFile(sessionId);
    if (!file) return null;
    return this.parseSessionFile(file);
  }

  async getProjects(): Promise<SessionProjectCount[]> {
    const files = await this.refreshIndex();
    const counts: Record<string, number> = {};
    for (const file of files) {
      const detail = await this.parseSessionFile(file);
      if (!detail) continue;
      const projectName = detail.summary.projectName;
      counts[projectName] = (counts[projectName] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([projectName, count]) => ({ projectName, count }))
      .sort((a, b) => b.count - a.count || a.projectName.localeCompare(b.projectName));
  }

  watchSession(sessionId: string, onChange: () => void) {
    const existing = this.watchers.get(sessionId);
    if (existing) return existing;

    const session = this.sessionIndex.get(sessionId);
    if (!session) return null;

    const watcher = watch(session.filePath, { persistent: false }, () => {
      const currentTimer = this.debounceTimers.get(sessionId);
      if (currentTimer) clearTimeout(currentTimer);
      const timer = setTimeout(() => {
        onChange();
        this.debounceTimers.delete(sessionId);
      }, 150);
      this.debounceTimers.set(sessionId, timer);
    });

    const handle = {
      close: () => {
        watcher.close();
        const currentTimer = this.debounceTimers.get(sessionId);
        if (currentTimer) clearTimeout(currentTimer);
        this.debounceTimers.delete(sessionId);
        this.watchers.delete(sessionId);
      },
    };
    this.watchers.set(sessionId, handle);
    return handle;
  }

  private async refreshIndex(): Promise<SessionFileIndex[]> {
    const files: SessionFileIndex[] = [];
    this.sessionIndex.clear();
    try {
      await this.walkDirectory(this.rootPath, async (filePath) => {
        const id = path.basename(filePath).replace(path.extname(filePath), '');
        const rel = path.relative(this.rootPath, path.dirname(filePath));
        const projectName = this.deriveProjectFromPath(rel);
        const indexEntry: SessionFileIndex = { id, filePath, projectName };
        this.sessionIndex.set(id, indexEntry);
        files.push(indexEntry);
      });
    } catch (error) {
      return [];
    }
    return files;
  }

  private async walkDirectory(
    dir: string,
    onFile: (filePath: string) => Promise<void>,
  ) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error: any) {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return this.walkDirectory(fullPath, onFile);
        }
        if (entry.isFile() && this.isSessionFile(entry.name)) {
          await onFile(fullPath);
        }
      }),
    );
  }

  private isSessionFile(fileName: string) {
    return fileName.endsWith('.jsonl') || fileName.endsWith('.json');
  }

  private async resolveSessionFile(sessionId: string) {
    if (this.sessionIndex.has(sessionId)) {
      return this.sessionIndex.get(sessionId) as SessionFileIndex;
    }
    const files = await this.refreshIndex();
    return files.find((file) => file.id === sessionId);
  }

  private async parseSessionFile(file: SessionFileIndex): Promise<SessionDetail | null> {
    try {
      const raw = await fs.readFile(file.filePath, 'utf8');
      const stat = await fs.stat(file.filePath);
      const records = this.parseRecords(raw);
      if (!records.length) return null;

      const messages: SessionMessage[] = [];
      for (let i = 0; i < records.length; i += 1) {
        const normalized = this.normalizeMessage(records[i], i);
        if (normalized) messages.push(normalized);
      }

      if (!messages.length) return null;
      const startedAt =
        messages[0].ts || stat.birthtime?.toISOString?.() || new Date().toISOString();
      const updatedAt =
        messages[messages.length - 1].ts || stat.mtime?.toISOString?.() || startedAt;
      const title = this.deriveTitle(records, messages);
      const summary: SessionSummary = {
        id: file.id,
        provider: 'claude',
        projectName: this.deriveProjectName(file, records),
        title,
        startedAt,
        updatedAt,
        messageCount: messages.length,
        resumeCommand: `${this.resumePrefix} ${file.id}`,
      };

      return { summary, messages };
    } catch (error) {
      return null;
    }
  }

  private deriveProjectFromPath(rel: string) {
    const parts = rel.split(path.sep).filter(Boolean);
    if (!parts.length) return 'default';
    const projectsIndex = parts.indexOf('projects');
    if (projectsIndex >= 0 && parts[projectsIndex + 1]) {
      return parts[projectsIndex + 1];
    }
    return parts[0] || 'default';
  }

  private deriveProjectName(file: SessionFileIndex, records: any[]) {
    const projectRecord = records.find(
      (record) => record?.project || record?.project_name,
    );
    const recordProject = projectRecord?.project || projectRecord?.project_name;
    if (recordProject) return String(recordProject);
    return file.projectName;
  }

  private parseRecords(raw: string): any[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.messages)) return parsed.messages;
        if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
      } catch (error) {
        // Fallback to JSONL parsing
      }
    }

    const lines = raw.split(/\r?\n/).filter(Boolean);
    const records: any[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        records.push(parsed);
      } catch (error) {
        continue;
      }
    }
    return records;
  }

  private normalizeMessage(record: any, idx: number): SessionMessage | null {
    const role = record?.role || record?.author || 'assistant';
    const id = record?.id || record?.message_id || `msg-${idx}`;
    const tsRaw =
      record?.ts ||
      record?.timestamp ||
      record?.created_at ||
      record?.time ||
      record?.date;
    const ts = tsRaw ? new Date(tsRaw).toISOString() : undefined;
    const contentText = this.redactText(this.extractContent(record));
    const toolCalls = this.normalizeToolCalls(record);

    return {
      id: String(id),
      ts,
      role: String(role),
      contentText,
      contentBlocks: record?.content,
      toolCalls,
    };
  }

  private extractContent(record: any): string {
    if (typeof record?.text === 'string') return record.text;
    if (typeof record?.content === 'string') return record.content;
    if (Array.isArray(record?.content)) {
      return record.content
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : typeof item?.text === 'string'
              ? item.text
              : typeof item?.content === 'string'
                ? item.content
                : ''
        )
        .filter(Boolean)
        .join('\n');
    }
    if (record?.message && typeof record.message === 'string') return record.message;
    if (record?.prompt && typeof record.prompt === 'string') return record.prompt;
    return '';
  }

  private normalizeToolCalls(record: any): ToolCall[] {
    const rawCalls = record?.tool_calls || record?.tools || record?.calls;
    if (!rawCalls) return [];
    const calls = Array.isArray(rawCalls) ? rawCalls : [rawCalls];
    return calls.map((call: any, idx: number) => ({
      name: call?.name || call?.function?.name || `tool-${idx}`,
      input: this.redactValue(call?.input || call?.arguments || call?.function?.arguments),
      output: this.redactValue(call?.output || call?.result || call?.response),
      status: call?.status,
      startedAt:
        call?.startedAt ||
        call?.started_at ||
        (call?.timestamps && call.timestamps.start) ||
        undefined,
      endedAt:
        call?.endedAt ||
        call?.ended_at ||
        (call?.timestamps && call.timestamps.end) ||
        undefined,
    }));
  }

  private deriveTitle(records: any[], messages: SessionMessage[]) {
    const recordTitle =
      (records[0] && (records[0].title || records[0].topic || records[0].summary)) || '';
    if (recordTitle) return this.trimTitle(recordTitle);
    const firstUser = messages.find((msg) => msg.role === 'user');
    if (firstUser?.contentText) return this.trimTitle(firstUser.contentText);
    return 'Session';
  }

  private trimTitle(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 120) return normalized;
    return `${normalized.slice(0, 117)}...`;
  }

  private redactValue(value: unknown): unknown {
    if (typeof value === 'string') return this.redactText(value);
    if (Array.isArray(value)) return value.map((item) => this.redactValue(item));
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(
        ([key, entryValue]) => [key, this.redactValue(entryValue)],
      );
      return Object.fromEntries(entries);
    }
    return value;
  }

  private redactText(value: string) {
    if (!value) return '';
    const awsAccessKey = /AKIA[0-9A-Z]{16}/g;
    const secretLike = /secret_key=\w+/gi;
    const bearer = /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi;
    return value
      .replace(awsAccessKey, '[REDACTED_AWS_KEY]')
      .replace(secretLike, 'secret_key=[REDACTED]')
      .replace(bearer, 'Bearer [REDACTED]');
  }
}

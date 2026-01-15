/**
 * Replay Tests
 *
 * Tests for session replay and report generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createEventLogger } from '../src/lib/event-logger.js';
import {
  replaySession,
  formatSummaryText,
  formatSummaryJson,
  generateMarkdownReport,
  writeReportArtifact,
} from '../src/lib/replay.js';

describe('Replay', () => {
  let tempDir: string;
  let sessionDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'replay-test-')));
    sessionDir = path.join(tempDir, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Create a test session with events
   */
  function createTestSession(runId: string): void {
    const logger = createEventLogger({ sessionDir, runId });

    logger.logRunStart({
      command: 'build',
      args: ['--ci', '--verbose'],
      normalized_env: { NODE_ENV: 'production' },
      repo_root: '/repo',
      branch: 'main',
      policy_enabled: true,
      sandbox_enabled: true,
    });

    logger.logStepStart({
      step_name: 'compile',
      step_id: 'step-1',
    });

    logger.logAction({
      action_type: 'read',
      affected_files: ['src/index.ts', 'src/lib/utils.ts'],
    });

    logger.logAction({
      action_type: 'write',
      affected_files: ['dist/index.js'],
      diff_bytes: 1024,
    });

    logger.logProviderCall({
      provider_name: 'anthropic',
      request_id: 'req-1',
      retries: 1,
      input_tokens: 100,
      output_tokens: 500,
      status: 'success',
    });

    logger.logToolExec({
      tool: 'tsc',
      args: ['--build'],
      exit_code: 0,
      timeout: false,
    });

    logger.logRunEnd({
      status: 'completed',
      diagnostics: {
        total_operations: 4,
        files_read: 2,
        files_written: 1,
        tools_executed: 1,
        provider_calls: 1,
        retries: 1,
        errors: 0,
        denied: 0,
      },
    });
  }

  describe('replaySession', () => {
    it('reads events and builds summary', () => {
      createTestSession('test-session');

      const { events, summary } = replaySession({
        sessionDir,
        runId: 'test-session',
      });

      expect(events.length).toBe(7);
      expect(summary.run_id).toBe('test-session');
      expect(summary.command).toBe('build');
      expect(summary.status).toBe('completed');
    });

    it('returns empty events for non-existent session', () => {
      const { events, summary } = replaySession({
        sessionDir,
        runId: 'nonexistent',
      });

      expect(events).toEqual([]);
      expect(summary.total_events).toBe(0);
    });
  });

  describe('buildReplaySummary', () => {
    it('builds summary with correct counts', () => {
      createTestSession('summary-test');

      const { summary } = replaySession({
        sessionDir,
        runId: 'summary-test',
      });

      expect(summary.total_events).toBe(7);
      expect(summary.steps.length).toBe(1);
      expect(summary.files.total_actions).toBe(2);
      expect(summary.files.files_read).toEqual(['src/index.ts', 'src/lib/utils.ts']);
      expect(summary.files.files_written).toEqual(['dist/index.js']);
      expect(summary.providers.total_calls).toBe(1);
      expect(summary.tools.total_executions).toBe(1);
    });

    it('tracks provider stats correctly', () => {
      const logger = createEventLogger({ sessionDir, runId: 'provider-stats' });

      logger.logRunStart({
        command: 'test',
        args: [],
        normalized_env: {},
        policy_enabled: false,
        sandbox_enabled: false,
      });

      logger.logProviderCall({
        provider_name: 'anthropic',
        request_id: 'req-1',
        retries: 2,
        input_tokens: 100,
        output_tokens: 200,
        status: 'success',
      });

      logger.logProviderCall({
        provider_name: 'anthropic',
        request_id: 'req-2',
        retries: 0,
        input_tokens: 50,
        output_tokens: 100,
        status: 'error',
      });

      logger.logProviderCall({
        provider_name: 'openai',
        request_id: 'req-3',
        retries: 1,
        status: 'timeout',
      });

      const { summary } = replaySession({
        sessionDir,
        runId: 'provider-stats',
      });

      expect(summary.providers.total_calls).toBe(3);
      expect(summary.providers.successful).toBe(1);
      expect(summary.providers.errors).toBe(1);
      expect(summary.providers.timeouts).toBe(1);
      expect(summary.providers.total_retries).toBe(3);

      expect(summary.providers.providers.anthropic.calls).toBe(2);
      expect(summary.providers.providers.anthropic.input_tokens).toBe(150);
      expect(summary.providers.providers.openai.calls).toBe(1);
    });

    it('tracks tool stats correctly', () => {
      const logger = createEventLogger({ sessionDir, runId: 'tool-stats' });

      logger.logRunStart({
        command: 'test',
        args: [],
        normalized_env: {},
        policy_enabled: false,
        sandbox_enabled: false,
      });

      logger.logToolExec({ tool: 'git', args: ['status'], exit_code: 0, timeout: false });
      logger.logToolExec({ tool: 'git', args: ['add'], exit_code: 0, timeout: false });
      logger.logToolExec({ tool: 'npm', args: ['install'], exit_code: 1, timeout: false });
      logger.logToolExec({ tool: 'npm', args: ['test'], exit_code: 0, timeout: true });

      const { summary } = replaySession({
        sessionDir,
        runId: 'tool-stats',
      });

      expect(summary.tools.total_executions).toBe(4);
      expect(summary.tools.successful).toBe(2);
      expect(summary.tools.failed).toBe(1);
      expect(summary.tools.timeouts).toBe(1);

      expect(summary.tools.tools.git.executions).toBe(2);
      expect(summary.tools.tools.git.failures).toBe(0);
      expect(summary.tools.tools.npm.executions).toBe(2);
      expect(summary.tools.tools.npm.failures).toBe(1);
      expect(summary.tools.tools.npm.timeouts).toBe(1);
    });

    it('collects errors correctly', () => {
      const logger = createEventLogger({ sessionDir, runId: 'error-test' });

      logger.logRunStart({
        command: 'test',
        args: [],
        normalized_env: {},
        policy_enabled: false,
        sandbox_enabled: false,
      });

      logger.logError({
        category: 'policy',
        message: 'Access denied',
        deny_reasons: ['rule_1', 'rule_2'],
      });

      logger.logError({
        category: 'sandbox',
        message: 'Path not allowed',
        deny_reasons: [],
      });

      const { summary } = replaySession({
        sessionDir,
        runId: 'error-test',
      });

      expect(summary.errors.length).toBe(2);
      expect(summary.errors[0].category).toBe('policy');
      expect(summary.errors[0].deny_reasons).toEqual(['rule_1', 'rule_2']);
      expect(summary.errors[1].category).toBe('sandbox');
    });

    it('deduplicates files', () => {
      const logger = createEventLogger({ sessionDir, runId: 'dedup-test' });

      logger.logRunStart({
        command: 'test',
        args: [],
        normalized_env: {},
        policy_enabled: false,
        sandbox_enabled: false,
      });

      logger.logAction({
        action_type: 'read',
        affected_files: ['file.txt'],
      });

      logger.logAction({
        action_type: 'read',
        affected_files: ['file.txt'], // Duplicate
      });

      const { summary } = replaySession({
        sessionDir,
        runId: 'dedup-test',
      });

      expect(summary.files.files_read).toEqual(['file.txt']);
    });
  });

  describe('formatSummaryText', () => {
    it('produces readable text output', () => {
      createTestSession('text-format');

      const { summary } = replaySession({
        sessionDir,
        runId: 'text-format',
      });

      const text = formatSummaryText(summary);

      expect(text).toContain('Run Summary:');
      expect(text).toContain('Command: build');
      expect(text).toContain('Status: completed');
      expect(text).toContain('Files:');
      expect(text).toContain('Provider Calls:');
      expect(text).toContain('Tool Executions:');
    });

    it('is deterministic', () => {
      createTestSession('det-text');

      const { summary } = replaySession({
        sessionDir,
        runId: 'det-text',
      });

      const text1 = formatSummaryText(summary);
      const text2 = formatSummaryText(summary);

      expect(text1).toBe(text2);
    });
  });

  describe('formatSummaryJson', () => {
    it('produces valid JSON output', () => {
      createTestSession('json-format');

      const { summary } = replaySession({
        sessionDir,
        runId: 'json-format',
      });

      const json = formatSummaryJson(summary);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('has sorted keys', () => {
      createTestSession('sorted-keys');

      const { summary } = replaySession({
        sessionDir,
        runId: 'sorted-keys',
      });

      const json = formatSummaryJson(summary);
      const parsed = JSON.parse(json);
      const keys = Object.keys(parsed);

      expect(keys).toEqual([...keys].sort());
    });
  });

  describe('generateMarkdownReport', () => {
    it('produces markdown output', () => {
      createTestSession('md-report');

      const { events, summary } = replaySession({
        sessionDir,
        runId: 'md-report',
      });

      const report = generateMarkdownReport(summary, events);

      expect(report).toContain('# Replay Report:');
      expect(report).toContain('## Overview');
      expect(report).toContain('## Timeline');
      expect(report).toContain('## Files');
      expect(report).toContain('## Provider Stats');
      expect(report).toContain('## Tool Stats');
    });

    it('includes timeline with all events', () => {
      createTestSession('timeline');

      const { events, summary } = replaySession({
        sessionDir,
        runId: 'timeline',
      });

      const report = generateMarkdownReport(summary, events);

      expect(report).toContain('run_start');
      expect(report).toContain('step_start');
      expect(report).toContain('action');
      expect(report).toContain('provider_call');
      expect(report).toContain('tool_exec');
      expect(report).toContain('run_end');
    });

    it('includes errors section when errors exist', () => {
      const logger = createEventLogger({ sessionDir, runId: 'errors-md' });

      logger.logRunStart({
        command: 'test',
        args: [],
        normalized_env: {},
        policy_enabled: false,
        sandbox_enabled: false,
      });

      logger.logError({
        category: 'policy',
        message: 'Access denied',
        deny_reasons: ['rule_1'],
      });

      const { events, summary } = replaySession({
        sessionDir,
        runId: 'errors-md',
      });

      const report = generateMarkdownReport(summary, events);

      expect(report).toContain('## Errors');
      expect(report).toContain('policy');
      expect(report).toContain('Access denied');
    });
  });

  describe('writeReportArtifact', () => {
    it('writes report to file', () => {
      createTestSession('write-report');

      const { events, summary } = replaySession({
        sessionDir,
        runId: 'write-report',
      });

      const reportPath = writeReportArtifact(
        { sessionDir, runId: 'write-report' },
        summary,
        events
      );

      expect(fs.existsSync(reportPath)).toBe(true);
      expect(reportPath).toBe(path.join(sessionDir, 'write-report', 'replay.md'));

      const content = fs.readFileSync(reportPath, 'utf-8');
      expect(content).toContain('# Replay Report:');
    });
  });

  describe('Deterministic Output', () => {
    it('replay produces same output for same events', () => {
      // Create two identical sessions
      const runId1 = 'det-1';
      const runId2 = 'det-2';

      for (const runId of [runId1, runId2]) {
        const logger = createEventLogger({ sessionDir, runId });

        logger.logRunStart({
          command: 'test',
          args: ['--ci'],
          normalized_env: { A: '1' },
          policy_enabled: true,
          sandbox_enabled: true,
        });

        logger.logAction({
          action_type: 'read',
          affected_files: ['b.txt', 'a.txt'],
        });

        logger.logRunEnd({
          status: 'completed',
          diagnostics: {
            total_operations: 1,
            files_read: 2,
            files_written: 0,
            tools_executed: 0,
            provider_calls: 0,
            retries: 0,
            errors: 0,
            denied: 0,
          },
        });
      }

      const result1 = replaySession({ sessionDir, runId: runId1 });
      const result2 = replaySession({ sessionDir, runId: runId2 });

      // Summaries should be identical except for run_id
      const summary1 = { ...result1.summary, run_id: 'normalized' };
      const summary2 = { ...result2.summary, run_id: 'normalized' };

      expect(JSON.stringify(summary1)).toBe(JSON.stringify(summary2));
    });
  });
});

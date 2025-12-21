import fs from 'fs';
import path from 'path';
import { runQuery, undo, getHistory } from '../src/engine';

describe('NL→Cypher engine', () => {
  const sessionId = 'test-session';
  const logPath = path.join(__dirname, '..', 'redteam.log');

  afterAll(() => {
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });

  it('generates cypher with cost estimates and tracks history', () => {
    const result = runQuery(sessionId, 'find path');
    expect(result.cypher).toContain('MATCH');
    expect(result.estimate).toBeGreaterThan(0);
    expect(getHistory(sessionId)).toHaveLength(1);
  });

  it('logs red-team prompts and supports undo', () => {
    runQuery(sessionId, 'DROP database');
    expect(fs.readFileSync(logPath, 'utf-8')).toContain('DROP database');
    const previous = undo(sessionId);
    expect(previous.cypher).toContain('MATCH');
  });
});

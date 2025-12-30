import { scoreItem, generateReport } from '../scorer';

describe('Scorer Logic', () => {
  it('should score exact matches correctly', () => {
    const item = {
      input: 'Q',
      expected: 'Ans',
      criteria: 'Exact match: Ans'
    };

    const resultPass = scoreItem(item, 'Ans');
    expect(resultPass.score).toBe(1);
    expect(resultPass.pass).toBe(true);

    const resultFail = scoreItem(item, 'Other');
    expect(resultFail.score).toBe(0);
    expect(resultFail.pass).toBe(false);
  });

  it('should score fuzzy matches correctly', () => {
    const item = {
      input: 'Q',
      expected: 'IntelGraph Team',
      criteria: 'Must mention IntelGraph Team'
    };

    const resultPass = scoreItem(item, 'The IntelGraph Team built it.');
    expect(resultPass.pass).toBe(true);

    const resultFail = scoreItem(item, 'Someone else.');
    expect(resultFail.pass).toBe(false);
  });
});

describe('Report Generation', () => {
  it('should generate valid summary', () => {
    const results = [
      { input: '1', expected: '1', actual: '1', score: 1, pass: true, evidence: { stub: true } },
      { input: '2', expected: '2', actual: 'x', score: 0, pass: false, evidence: { stub: true } }
    ];

    const report = generateReport(results, { test: true });
    expect(report.summary.total).toBe(2);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.accuracy).toBe(0.5);
    expect(report.config.test).toBe(true);
  });
});

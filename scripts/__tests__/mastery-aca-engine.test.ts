const { execSync } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '../mastery-aca-engine.ts');

describe('Mastery ACA Engine', () => {
    const runAca = (args: string) => {
        try {
            const output = execSync(`npx ts-node ${SCRIPT_PATH} ${args}`, { encoding: 'utf8' });
            return JSON.parse(output);
        } catch (error: any) {
            if (error.status === 2) {
                return JSON.parse(error.stdout);
            }
            throw error;
        }
    };

    it('should promote if metrics are stable', () => {
        const result = runAca('--canary-p95 100 --baseline-p95 100 --canary-error 0.0 --baseline-error 0.0');
        expect(result.decision).toBe('PROMOTE');
        expect(result.risk_score).toBe(0);
    });

    it('should warn if there is slight latency drift', () => {
        const result = runAca('--canary-p95 110 --baseline-p95 100 --canary-error 0.0 --baseline-error 0.0');
        expect(result.decision).toBe('WARNING');
        expect(result.risk_score).toBeGreaterThan(0);
        expect(result.risk_score).toBeLessThan(50);
    });

    it('should rollback if latency regression is severe', () => {
        const result = runAca('--canary-p95 150 --baseline-p95 100 --canary-error 0.0 --baseline-error 0.0');
        expect(result.decision).toBe('ROLLBACK');
        expect(result.risk_score).toBeGreaterThanOrEqual(50);
    });

    it('should rollback if error rate increases significantly', () => {
        const result = runAca('--canary-p95 100 --baseline-p95 100 --canary-error 0.02 --baseline-error 0.0');
        expect(result.decision).toBe('ROLLBACK');
    });
});

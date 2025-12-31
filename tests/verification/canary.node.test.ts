import { promises as fs } from 'fs';
import * as path from 'path';

describe('Canary Release Verification', () => {

    const SCRIPTS_DIR = path.join(__dirname, '..', '..', 'scripts');
    const DOCS_DIR = path.join(__dirname, '..', '..', 'docs', 'ga');

    // 1. Verify Canary Configuration
    describe('Canary Strategy Document', () => {
        const canaryStrategyPath = path.join(DOCS_DIR, 'CANARY_STRATEGY.md');

        it('should exist and be readable', async () => {
            const stats = await fs.stat(canaryStrategyPath);
            expect(stats.isFile()).toBe(true);
        });

        it('should define all required sections', async () => {
            const content = await fs.readFile(canaryStrategyPath, 'utf-8');
            expect(content).toMatch(/2\.1 Canary Scope/);
            expect(content).toMatch(/2\.2 Traffic Split Semantics/);
            expect(content).toMatch(/2\.3 Canary Duration and Promotion Criteria/);
            expect(content).toMatch(/2\.4 Automatic Abort Conditions/);
            expect(content).toMatch(/2\.5 Required Observability Signals/);
        });
    });

    // 2. Verify Canary Automation
    describe('Canary Deployment Script', () => {
        const deployCanaryScriptPath = path.join(SCRIPTS_DIR, 'canary', 'deploy-canary.sh');

        it('should exist and be readable', async () => {
            const stats = await fs.stat(deployCanaryScriptPath);
            expect(stats.isFile()).toBe(true);
        });

        it('should contain logic for progressive traffic shifting', async () => {
            const content = await fs.readFile(deployCanaryScriptPath, 'utf-8');
            expect(content).toMatch(/CANARY_STAGES=/);
            expect(content).toMatch(/helm upgrade .* --set canary.weight/);
        });

        it('should include calls to check SLOs', async () => {
            const content = await fs.readFile(deployCanaryScriptPath, 'utf-8');
            expect(content).toMatch(/check_slo_compliance/);
        });

        it('should have a rollback mechanism', async () => {
            const content = await fs.readFile(deployCanaryScriptPath, 'utf-8');
            expect(content).toMatch(/scripts\/rollback-release.sh/);
        });
    });

    // 3. Verify Canary Wiring
    describe('Canary and CI Integration', () => {
        it('should be wired into the post-release canary workflow', async () => {
            const canaryWorkflowPath = path.join(__dirname, '..', '..', '.github', 'workflows', 'post-release-canary.yml');
            const content = await fs.readFile(canaryWorkflowPath, 'utf-8');

            expect(content).toMatch(/on:\s*\n\s*release:\s*\n\s*types:\s*\[published\]/);
            expect(content).toMatch(/run: \.\/scripts\/canary\/deploy-canary.sh/);
        });
    });
});

import { buildRegulatoryArtifacts } from '../../cli/src/lib/regulatory/builder.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Regulatory ControlPack Determinism', () => {
    const tmpDir = path.resolve('tmp/test-reg-determinism');

    it('should produce identical artifacts on repeated runs', async () => {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

        await buildRegulatoryArtifacts(tmpDir);
        const run1 = fs.readFileSync(path.join(tmpDir, 'eu-gpai/controlpack.json'), 'utf-8');

        await new Promise(r => setTimeout(r, 10));

        await buildRegulatoryArtifacts(tmpDir);
        const run2 = fs.readFileSync(path.join(tmpDir, 'eu-gpai/controlpack.json'), 'utf-8');

        expect(run1).toBe(run2);

        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
});

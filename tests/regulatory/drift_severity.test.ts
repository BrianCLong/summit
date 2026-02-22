import { diffRegulatoryArtifacts } from '../../cli/src/lib/regulatory/diff.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Regulatory Drift Severity', () => {
    const tmpBase = path.resolve('tmp/test-drift-base');
    const tmpNew = path.resolve('tmp/test-drift-new');

    const setupArtifacts = (dir: string, slug: string, data: any) => {
        const d = path.join(dir, slug);
        fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, 'controlpack.json'), JSON.stringify(data));
    };

    it('should detect HIGH severity when EU timeline changes', async () => {
        if (fs.existsSync(tmpBase)) fs.rmSync(tmpBase, { recursive: true, force: true });
        if (fs.existsSync(tmpNew)) fs.rmSync(tmpNew, { recursive: true, force: true });

        const baseData = {
            slug: 'eu-gpai',
            sources: [{ data: { timeline: [{ date: '2025-01-01' }] }, etag: 'a' }]
        };
        const newData = {
            slug: 'eu-gpai',
            sources: [{ data: { timeline: [{ date: '2026-01-01' }] }, etag: 'b' }]
        };

        setupArtifacts(tmpBase, 'eu-gpai', baseData);
        setupArtifacts(tmpNew, 'eu-gpai', newData);

        const diff = await diffRegulatoryArtifacts(tmpNew, tmpBase);
        expect(diff['eu-gpai'].severity).toBe('HIGH');

        fs.rmSync(tmpBase, { recursive: true, force: true });
        fs.rmSync(tmpNew, { recursive: true, force: true });
    });
});

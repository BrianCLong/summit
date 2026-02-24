import * as fs from 'fs';
import * as path from 'path';

export async function diffRegulatoryArtifacts(currentDir: string, baselineDir: string): Promise<any> {
    const diffs: any = {};

    if (!fs.existsSync(currentDir)) return diffs;

    const slugs = fs.readdirSync(currentDir).filter(f => fs.statSync(path.join(currentDir, f)).isDirectory());

    for (const slug of slugs) {
        const currentPath = path.join(currentDir, slug, 'controlpack.json');
        const baselinePath = path.join(baselineDir, slug, 'controlpack.json');

        if (!fs.existsSync(baselinePath)) {
            diffs[slug] = { status: 'new', severity: 'MEDIUM' };
            continue;
        }

        const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

        if (JSON.stringify(current) !== JSON.stringify(baseline)) {
             let severity = 'LOW';

             // Check if timelines/dates changed (high impact)
             // This assumes specific structure for EU GPAI. For others we might default to MEDIUM.
             if (slug === 'eu-gpai') {
                 const currentDates = current.sources[0]?.data?.timeline?.map((t: any) => t.date) || [];
                 const baselineDates = baseline.sources[0]?.data?.timeline?.map((t: any) => t.date) || [];
                 if (JSON.stringify(currentDates) !== JSON.stringify(baselineDates)) {
                     severity = 'HIGH';
                 }
             }

             const currentEtag = current.sources[0]?.etag;
             const baselineEtag = baseline.sources[0]?.etag;

             if (currentEtag !== baselineEtag && severity === 'LOW') {
                 severity = 'MEDIUM';
             }

             diffs[slug] = { status: 'changed', severity };
        }
    }

    return diffs;
}

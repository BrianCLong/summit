import fs from "fs";
import path from "path";

// Types matching schemas
export interface EvidenceReport {
    evidence_id: string;
    item: { url: string };
    provider: { name: string };
    summary: string;
    artifacts: string[];
}

export interface EvidenceMetrics {
    metrics: Record<string, any>;
}

export interface EvidenceStamp {
    timestamp: string;
}

export function emitEvidence(
    evidenceId: string,
    data: { report: Omit<EvidenceReport, "artifacts" | "evidence_id">; metrics: EvidenceMetrics; stamp?: EvidenceStamp },
    baseDir: string = "evidence"
) {
    const dir = path.join(baseDir, evidenceId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const artifacts: string[] = [];

    // Write Metrics (first so we can list it in report)
    const metricsPath = path.join(dir, "metrics.json");
    fs.writeFileSync(metricsPath, JSON.stringify(data.metrics, null, 2));
    artifacts.push(metricsPath);

    // Write Stamp
    const stampPath = path.join(dir, "stamp.json");
    const stamp: EvidenceStamp = data.stamp ?? { timestamp: new Date().toISOString() };
    fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
    artifacts.push(stampPath);

    // Write Report
    const reportPath = path.join(dir, "report.json");
    const report: EvidenceReport = {
        evidence_id: evidenceId,
        ...data.report,
        artifacts
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Update Index
    updateIndex(evidenceId, reportPath, metricsPath, stampPath, baseDir);
}

function updateIndex(evidenceId: string, reportPath: string, metricsPath: string, stampPath: string, baseDir: string) {
    const indexPath = path.join(baseDir, "index.json");
    let index: { items: any[] } = { items: [] };

    if (fs.existsSync(indexPath)) {
        try {
            index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        } catch (e) {
            // Ignore corrupted index
        }
    }

    const item = {
        evidence_id: evidenceId,
        report: reportPath,
        metrics: metricsPath,
        stamp: stampPath
    };

    const existingIdx = index.items.findIndex((i: any) => i.evidence_id === evidenceId);
    if (existingIdx >= 0) {
        index.items[existingIdx] = item;
    } else {
        index.items.push(item);
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

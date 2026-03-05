import * as fs from 'fs';
import * as path from 'path';

function checkDrift() {
    const reportPath = path.join(process.cwd(), 'reports/agent-scaling/metrics.json');
    if (fs.existsSync(reportPath)) {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

        if (data.coordinationEfficiency < 0) {
            console.warn("DRIFT DETECTED: Coordination efficiency is negative");
        }

        const driftReport = { timestamp: new Date().toISOString(), ...data };
        const outDir = path.join(process.cwd(), 'reports/monitoring');
        if (!fs.existsSync(outDir)) {
             fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outDir, 'agent-scaling-trend.json'), JSON.stringify(driftReport, null, 2));
        console.log("Drift monitoring report generated.");
    } else {
        console.log("No metrics found to check drift against.");
    }
}

checkDrift();

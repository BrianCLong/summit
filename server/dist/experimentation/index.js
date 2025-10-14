import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
export class ExperimentManager {
    constructor(configPath = path.join(process.cwd(), 'config', 'experiments.yaml'), logFile = path.join(process.cwd(), 'experiment-exposures.log')) {
        this.configPath = configPath;
        this.experiments = [];
        this.logPath = logFile;
        this.loadConfig();
    }
    loadConfig() {
        const file = fs.readFileSync(this.configPath, 'utf8');
        const parsed = yaml.load(file);
        this.experiments = parsed.experiments || [];
    }
    getVariant(experimentId, userId) {
        const exp = this.experiments.find((e) => e.id === experimentId);
        if (!exp)
            return null;
        const hash = crypto.createHash('sha256').update(`${experimentId}:${userId}`).digest('hex');
        const num = parseInt(hash.slice(0, 8), 16) % 100;
        let cumulative = 0;
        for (const [variant, weight] of Object.entries(exp.variant_split)) {
            cumulative += weight;
            if (num < cumulative)
                return variant;
        }
        return null;
    }
    logExposure(experimentId, userId, variant, metrics) {
        const entry = {
            ts: new Date().toISOString(),
            experimentId,
            userId,
            variant,
            metrics,
        };
        fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`);
    }
}
//# sourceMappingURL=index.js.map
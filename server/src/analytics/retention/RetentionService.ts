import fs from 'fs';
import path from 'path';

export class RetentionService {
    private logDir: string;

    constructor(logDir: string) {
        this.logDir = logDir;
    }

    // Deletes files older than N days
    public runRetentionPolicy(daysToKeep: number): number {
        if (!fs.existsSync(this.logDir)) return 0;

        const files = fs.readdirSync(this.logDir).filter((f: string) => f.startsWith('telemetry-') && f.endsWith('.jsonl'));
        const now = new Date();
        let deletedCount = 0;

        for (const file of files) {
            // Filename format: telemetry-YYYY-MM-DD.jsonl
            const match = file.match(/telemetry-(\d{4}-\d{2}-\d{2})\.jsonl/);
            if (match) {
                const dateStr = match[1];
                const fileDate = new Date(dateStr);
                const diffTime = Math.abs(now.getTime() - fileDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > daysToKeep) {
                    fs.unlinkSync(path.join(this.logDir, file));
                    deletedCount++;
                }
            }
        }
        return deletedCount;
    }
}

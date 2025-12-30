import { SplunkSIEMSink } from '../splunk/exporter.js';
import { pg } from '../../db/pg.js';
import { SIEMEvent } from '../../siem/types.js';

export class SIEMManager {
    // In-memory cache of sinks for performance (stubbed)
    private sinks: Map<string, SplunkSIEMSink> = new Map();

    async getSink(tenantId: string): Promise<SplunkSIEMSink | null> {
        if (this.sinks.has(tenantId)) {
            return this.sinks.get(tenantId)!;
        }

        // Fetch config from DB (assuming table siem_configs exists)
        // For now, return null or mock
        return null;
    }

    async exportEvent(tenantId: string, event: SIEMEvent) {
        const sink = await this.getSink(tenantId);
        if (sink) {
            await sink.send([event]);
        }
    }
}

export const siemManager = new SIEMManager();

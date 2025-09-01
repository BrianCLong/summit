export class VirusTotalConnector {
    constructor() {
        this.name = 'virustotal';
        this.version = '1.0.0';
        this.schedule = 'interval';
        this.intervalMs = 15000;
    }
    async *run(ctx) {
        ctx.log('virustotal.run');
        return;
    }
}
//# sourceMappingURL=VirusTotalConnector.js.map
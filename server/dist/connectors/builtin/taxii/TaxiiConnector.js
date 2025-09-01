export class TaxiiConnector {
    constructor() {
        this.name = 'taxii';
        this.version = '1.0.0';
        this.schedule = 'interval';
        this.intervalMs = 60000;
    }
    async *run(ctx) {
        ctx.log('taxii.run');
        // fixture-driven implementation placeholder
        return;
    }
}
//# sourceMappingURL=TaxiiConnector.js.map
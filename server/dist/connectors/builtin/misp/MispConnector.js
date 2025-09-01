export class MispConnector {
    constructor() {
        this.name = 'misp';
        this.version = '1.0.0';
        this.schedule = 'interval';
        this.intervalMs = 300000;
    }
    async *run(ctx) {
        ctx.log('misp.run');
        return;
    }
}
//# sourceMappingURL=MispConnector.js.map
class OTLPTraceExporter {
  constructor() {
    this.export = () => {};
    this.shutdown = () => Promise.resolve();
  }
}

module.exports = { OTLPTraceExporter };

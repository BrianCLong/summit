const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class LineageSink {
  constructor(options = {}) {
    this.bus = options.bus || new EventEmitter();
    this.outputPath = options.outputPath || path.join(__dirname, '..', 'lineage', 'graph.json');
    this.graph = { nodes: {}, edges: [] };
    this.metrics = { total: 0, failed: 0 };
    this.bus.on('lineage-event', (event) => {
      try {
        this.ingest(event);
      } catch (error) {
        this.metrics.failed += 1;
        if (options.logger) {
          options.logger.error('Lineage ingestion failed', error);
        }
      }
    });
  }

  ingest(event) {
    this.metrics.total += 1;
    const required = ['contract', 'version', 'action', 'who', 'when', 'where', 'why'];
    required.forEach((key) => {
      if (!event[key]) {
        throw new Error(`Missing required lineage attribute: ${key}`);
      }
    });
    const datasetId = `contract:${event.contract}:${event.version}`;
    this.graph.nodes[datasetId] = {
      id: datasetId,
      type: 'dataset',
      contract: event.contract,
      version: event.version
    };
    const actorId = `actor:${event.who}`;
    this.graph.nodes[actorId] = { id: actorId, type: 'actor', name: event.who };
    const systemId = `system:${event.where}`;
    this.graph.nodes[systemId] = { id: systemId, type: 'system', location: event.where };

    this.graph.edges.push({
      id: `edge:${this.graph.edges.length + 1}`,
      from: actorId,
      to: datasetId,
      via: systemId,
      action: event.action,
      why: event.why,
      timestamp: event.when,
      checksum: event.checksum || null
    });

    this.persist();
  }

  record(event) {
    this.bus.emit('lineage-event', event);
  }

  persist() {
    const dir = path.dirname(this.outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.outputPath, `${JSON.stringify(this.graph, null, 2)}\n`);
  }

  snapshot(filePath) {
    fs.writeFileSync(filePath, `${JSON.stringify(this.graph, null, 2)}\n`);
  }

  getDropRate() {
    if (this.metrics.total === 0) {
      return 0;
    }
    return this.metrics.failed / this.metrics.total;
  }
}

module.exports = {
  LineageSink
};

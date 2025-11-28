import { TelemetryEvent } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// Simple in-memory graph representation for v0.1
interface GraphNode {
  id: string;
  type: string; // run, event, model
  data: any;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export class TelemetryLayer {
  private logFile: string;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  constructor(logFilePath: string = 'governance_events.jsonl') {
    this.logFile = logFilePath;
    // Ensure log file exists or create it
    if (!fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
    }
  }

  public async logEvent(event: TelemetryEvent) {
    // 1. Write to JSONL (Async)
    const line = JSON.stringify(event) + '\n';
    await fs.promises.appendFile(this.logFile, line);

    // 2. Update Graph
    this.updateGraph(event);
  }

  private updateGraph(event: TelemetryEvent) {
    // Prevent Memory Leak: Cap graph size (Simple FIFO or just clear for v0.1)
    if (this.nodes.size > 10000) {
        this.nodes.clear(); // Drastic, but prevents OOM in this demo implementation
        this.edges = [];
    }

    // Node for the event
    this.nodes.set(event.id, {
      id: event.id,
      type: 'event',
      data: event
    });

    // Node for the run (if not exists)
    if (!this.nodes.has(event.runId)) {
      this.nodes.set(event.runId, {
        id: event.runId,
        type: 'run',
        data: { id: event.runId }
      });
    }

    // Edge: Event belongs to Run
    this.edges.push({
      from: event.id,
      to: event.runId,
      relation: 'belongs_to'
    });

    // If there's a model ID, link it
    if (event.modelId) {
       if (!this.nodes.has(event.modelId)) {
         this.nodes.set(event.modelId, {
           id: event.modelId,
           type: 'model',
           data: { id: event.modelId }
         });
       }
       this.edges.push({
         from: event.runId,
         to: event.modelId,
         relation: 'uses_model'
       });
    }

    // Causal link
    if (event.previousEventId) {
      this.edges.push({
        from: event.id,
        to: event.previousEventId,
        relation: 'follows'
      });
    }
  }

  public getGraphStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length
    };
  }

  public getTrace(runId: string) {
    // Find all events for a run
    const events = [];
    for (const node of this.nodes.values()) {
        if (node.type === 'event' && node.data.runId === runId) {
            events.push(node.data);
        }
    }
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

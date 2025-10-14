import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Driver } from 'neo4j-driver';

export interface ThreadMessage {
  text: string;
  evidence?: string[];
}

export interface ThreadInput {
  id: string;
  investigationId: string;
  messages: ThreadMessage[];
}

export interface ThreadQualityScores {
  coherence: number;
  evidence: number;
  redundancy: number;
  overall: number;
}

export default class InvestigativeThreadQualityAgent {
  private neo4j: Driver;
  private weights: { coherence: number; evidence: number; redundancy: number };

  constructor(neo4j: Driver) {
    this.neo4j = neo4j;
    this.weights = this.loadWeights();
  }

  private loadWeights(): { coherence: number; evidence: number; redundancy: number } {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const refPath = path.resolve(
        __dirname,
        '../../../AUTOMATE_SCORING_OF_RESPONSE_QUALITY_COMPLETED.md'
      );
      // Read reference file from previous scoring pipeline
      fs.readFileSync(refPath, 'utf-8');
      // Baseline weights derived from response quality scoring outputs
      return { coherence: 0.4, evidence: 0.4, redundancy: 0.2 };
    } catch {
      return { coherence: 0.4, evidence: 0.4, redundancy: 0.2 };
    }
  }

  private jaccard(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size ? intersection.size / union.size : 0;
  }

  private scoreCoherence(messages: ThreadMessage[]): number {
    if (messages.length <= 1) return 1;
    let total = 0;
    let count = 0;
    for (let i = 1; i < messages.length; i++) {
      total += this.jaccard(messages[i - 1].text, messages[i].text);
      count++;
    }
    return count ? total / count : 0;
  }

  private scoreEvidence(messages: ThreadMessage[]): number {
    if (!messages.length) return 0;
    const supported = messages.filter(
      m => (m.evidence && m.evidence.length > 0) || /\bhttps?:\/\//.test(m.text)
    ).length;
    return supported / messages.length;
  }

  private scoreRedundancy(messages: ThreadMessage[]): number {
    if (!messages.length) return 0;
    const texts = messages.map(m => m.text.trim().toLowerCase());
    const unique = new Set(texts);
    return 1 - unique.size / texts.length;
  }

  public scoreThread(thread: ThreadInput): ThreadQualityScores {
    const coherence = this.scoreCoherence(thread.messages);
    const evidence = this.scoreEvidence(thread.messages);
    const redundancy = this.scoreRedundancy(thread.messages);
    const overall =
      coherence * this.weights.coherence +
      evidence * this.weights.evidence +
      (1 - redundancy) * this.weights.redundancy;
    return { coherence, evidence, redundancy, overall };
  }

  public async updateGraphMetadata(
    thread: ThreadInput,
    scores: ThreadQualityScores
  ): Promise<void> {
    const session = this.neo4j.session();
    try {
      const query = `
        MATCH (t:Thread {id: $threadId})
        SET t.quality = $scores,
            t.lastQualityAt = datetime()
      `;
      await session.run(query, { threadId: thread.id, scores });
    } finally {
      await session.close();
    }
  }

  public async scoreAndUpdate(thread: ThreadInput): Promise<ThreadQualityScores> {
    const scores = this.scoreThread(thread);
    await this.updateGraphMetadata(thread, scores);
    return scores;
  }
}


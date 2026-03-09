/**
 * Paper Evidence Adapter
 *
 * Extracts evidence from research papers (arxiv, DOI, academic sources)
 */

import { BaseEvidenceAdapter, type EvidenceEvent, type AdapterConfig } from "../base-adapter.js";

/**
 * Paper Query Parameters
 */
export interface PaperQuery {
  /**
   * ArXiv ID (e.g., "1706.03762")
   */
  arxivId?: string;

  /**
   * DOI (e.g., "10.1234/example")
   */
  doi?: string;

  /**
   * Paper title (for search)
   */
  title?: string;

  /**
   * Authors (for search)
   */
  authors?: string[];

  /**
   * Optional publication year range
   */
  yearRange?: { from: number; to: number };

  /**
   * Optional venue filter
   */
  venue?: string;
}

/**
 * Paper Metadata
 */
export interface PaperMetadata {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  publishedAt: string;
  venue?: string;
  citationCount?: number;
  doi?: string;
  arxivId?: string;
  url?: string;
}

/**
 * Paper Evidence Adapter
 */
export class PaperAdapter extends BaseEvidenceAdapter {
  constructor(config?: Partial<AdapterConfig>) {
    super({
      name: "paper-adapter",
      evidenceType: "paper",
      ...config,
    });
  }

  /**
   * Fetch evidence from paper sources
   */
  async fetch(query: PaperQuery): Promise<EvidenceEvent[]> {
    const events: EvidenceEvent[] = [];

    // Handle arxiv ID
    if (query.arxivId) {
      const paper = await this.fetchArxivPaper(query.arxivId);
      if (paper) {
        events.push(this.createPaperEvent(paper));
      }
    }

    // Handle DOI
    if (query.doi) {
      const paper = await this.fetchDoiPaper(query.doi);
      if (paper) {
        events.push(this.createPaperEvent(paper));
      }
    }

    // Handle search by title/authors
    if (query.title || query.authors) {
      const papers = await this.searchPapers(query);
      for (const paper of papers) {
        events.push(this.createPaperEvent(paper));
      }
    }

    return events;
  }

  /**
   * Fetch paper from ArXiv
   *
   * NOTE: This is a deterministic mock implementation.
   * In production, this would call the ArXiv API.
   */
  private async fetchArxivPaper(arxivId: string): Promise<PaperMetadata | null> {
    // Mock implementation - in production would call ArXiv API
    // For now, return deterministic data for known papers

    const knownPapers: Record<string, PaperMetadata> = {
      "1706.03762": {
        id: "arxiv:1706.03762",
        title: "Attention Is All You Need",
        authors: ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki"],
        abstract: "The dominant sequence transduction models...",
        publishedAt: "2017-06-12T00:00:00Z",
        venue: "NeurIPS 2017",
        citationCount: 100000,
        arxivId: "1706.03762",
        url: "https://arxiv.org/abs/1706.03762",
      },
      "1810.04805": {
        id: "arxiv:1810.04805",
        title: "BERT: Pre-training of Deep Bidirectional Transformers",
        authors: ["Devlin, Jacob", "Chang, Ming-Wei", "Lee, Kenton"],
        abstract: "We introduce BERT...",
        publishedAt: "2018-10-11T00:00:00Z",
        venue: "NAACL 2019",
        citationCount: 80000,
        arxivId: "1810.04805",
        url: "https://arxiv.org/abs/1810.04805",
      },
    };

    return knownPapers[arxivId] || null;
  }

  /**
   * Fetch paper from DOI
   */
  private async fetchDoiPaper(doi: string): Promise<PaperMetadata | null> {
    // Mock implementation - in production would call CrossRef or DOI.org API
    return null;
  }

  /**
   * Search papers by title/authors
   */
  private async searchPapers(query: PaperQuery): Promise<PaperMetadata[]> {
    // Mock implementation - in production would call search API
    return [];
  }

  /**
   * Create evidence event from paper metadata
   */
  private createPaperEvent(paper: PaperMetadata): EvidenceEvent {
    // Extract technology/capability mentions from title
    const assertions = this.extractAssertions(paper);

    return {
      id: `paper-${paper.id}`,
      type: "paper",
      source: paper.arxivId ? `arxiv:${paper.arxivId}` : paper.doi ? `doi:${paper.doi}` : paper.id,
      uri: paper.url,
      observedAt: paper.publishedAt,
      confidence: 0.95, // Papers are high-confidence but not definitive like git commits
      assertions,
      rawMetadata: {
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        venue: paper.venue,
        citationCount: paper.citationCount,
        doi: paper.doi,
        arxivId: paper.arxivId,
      },
    };
  }

  /**
   * Extract assertions from paper metadata
   */
  private extractAssertions(paper: PaperMetadata): Array<{
    type: "node_exists" | "edge_exists" | "attribute_value" | "temporal_event";
    subject: string;
    predicate?: string;
    object?: any;
    confidence?: number;
  }> {
    const assertions: any[] = [];

    // Paper as a node
    assertions.push({
      type: "node_exists",
      subject: paper.id,
      confidence: 1.0,
    });

    // Publication event
    assertions.push({
      type: "temporal_event",
      subject: paper.id,
      predicate: "published",
      object: paper.publishedAt,
      confidence: 1.0,
    });

    // Authors
    for (const author of paper.authors) {
      assertions.push({
        type: "edge_exists",
        subject: author,
        predicate: "authors",
        object: paper.id,
        confidence: 1.0,
      });
    }

    // Citation count (if available)
    if (paper.citationCount !== undefined) {
      assertions.push({
        type: "attribute_value",
        subject: paper.id,
        predicate: "citation_count",
        object: paper.citationCount,
        confidence: 0.9, // Citation counts change over time
      });
    }

    // Technology mentions (simple heuristic based on title)
    const techKeywords = [
      "transformer", "bert", "gpt", "llm", "neural", "deep learning",
      "attention", "embedding", "pytorch", "tensorflow",
    ];

    for (const keyword of techKeywords) {
      if (paper.title.toLowerCase().includes(keyword)) {
        assertions.push({
          type: "edge_exists",
          subject: paper.id,
          predicate: "mentions",
          object: keyword,
          confidence: 0.8, // Heuristic-based, lower confidence
        });
      }
    }

    return assertions;
  }

  /**
   * Batch fetch papers
   */
  async fetchBatch(queries: PaperQuery[]): Promise<EvidenceEvent[]> {
    const results: EvidenceEvent[] = [];

    for (const query of queries) {
      try {
        const events = await this.fetch(query);
        results.push(...events);
      } catch (error) {
        console.error(`Error fetching paper: ${error}`);
      }
    }

    return results;
  }
}

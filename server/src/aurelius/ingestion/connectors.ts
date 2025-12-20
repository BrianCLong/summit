
import { Patent, ResearchPaper } from '../types';

export interface IngestionConnector {
  fetchPatents(query: string): Promise<any[]>;
  fetchPapers(query: string): Promise<any[]>;
}

export class USPTOConnector implements IngestionConnector {
  async fetchPatents(query: string): Promise<any[]> {
    // Mock implementation for MVP - in production this would hit the USPTO API
    // console.log(`Searching USPTO for: ${query}`);
    return [
      {
        patentNumber: 'US11223344',
        title: 'Mock Patent for ' + query,
        abstract: 'This is a mock abstract for a patent found via USPTO search.',
        claims: ['Claim 1: A system for...', 'Claim 2: The system of claim 1...'],
        filingDate: '2023-01-15',
        publicationDate: '2023-06-20',
        inventors: ['John Doe'],
        assignees: ['Acme Corp'],
        classification: ['G06F'],
        source: 'USPTO',
        labels: ['Patent', 'AureliusNode']
      }
    ];
  }

  async fetchPapers(query: string): Promise<any[]> {
    return []; // USPTO doesn't serve papers
  }
}

export class ArXivConnector implements IngestionConnector {
  async fetchPatents(query: string): Promise<any[]> {
    return [];
  }

  async fetchPapers(query: string): Promise<any[]> {
    // Mock implementation for MVP
    // console.log(`Searching ArXiv for: ${query}`);
    return [
      {
        doi: '10.1234/arxiv.2301.00001',
        title: 'Mock Paper on ' + query,
        abstract: 'This is a mock abstract for a paper found via ArXiv.',
        authors: ['Jane Smith', 'Bob Jones'],
        publicationDate: '2023-02-10',
        venue: 'ArXiv',
        source: 'ArXiv',
        labels: ['ResearchPaper', 'AureliusNode']
      }
    ];
  }
}

export class ConnectorFactory {
  static getConnector(source: string): IngestionConnector {
    switch (source) {
      case 'USPTO': return new USPTOConnector();
      case 'ArXiv': return new ArXivConnector();
      default: throw new Error(`Unknown source: ${source}`);
    }
  }
}

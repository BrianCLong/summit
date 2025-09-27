import { v4 as uuid } from 'uuid';

export interface Evidence {
  id: string;
  name: string;
  mime: string;
  sha256: string;
  size: number;
  addedAt: string;
}

export interface Case {
  id: string;
  title: string;
  status: string;
  priority: string;
  severity: string;
  assignees: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  alerts: any[];
  evidence: Evidence[];
  triageScore: number;
}

const cases: Case[] = [];

export const caseResolvers = {
  Query: {
    cases: () => cases,
    case: (_: any, { id }: { id: string }) => cases.find(c => c.id === id) || null,
    caseTimeline: () => []
  },
  Mutation: {
    createCase: (_: any, { title }: { title: string }) => {
      const c: Case = {
        id: uuid(),
        title,
        status: 'open',
        priority: 'medium',
        severity: 'medium',
        assignees: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        alerts: [],
        evidence: [],
        triageScore: 0
      };
      cases.push(c);
      return c;
    },
    addEvidence: (_: any, { caseId, name, base64, mime }: any) => {
      const c = cases.find(cs => cs.id === caseId);
      if (!c) throw new Error('case_not_found');
      const ev: Evidence = {
        id: uuid(),
        name,
        mime,
        sha256: base64, // placeholder
        size: base64.length,
        addedAt: new Date().toISOString()
      };
      c.evidence.push(ev);
      return ev;
    },
    linkAlertsToCase: () => null,
    setCaseStatus: (_: any, { caseId, status }: any) => {
      const c = cases.find(cs => cs.id === caseId);
      if (!c) throw new Error('case_not_found');
      c.status = status;
      c.updatedAt = new Date().toISOString();
      return c;
    },
    mergeCases: () => null,
    splitCase: () => null
  }
};

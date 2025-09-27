export type NlPlan = {
  cypher: string;
  params: Record<string, any>;
  readOnly: boolean;
  cost: { expands: number; estRows: number };
  explain: any;
};

export class Nl2CypherService {
  redact(input: string): string {
    return input.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]');
  }

  async plan(nl: string): Promise<NlPlan> {
    const redacted = this.redact(nl);
    return {
      cypher: 'MATCH (n) RETURN n LIMIT $limit',
      params: { limit: 25 },
      readOnly: true,
      cost: { expands: 1, estRows: 25 },
      explain: { prompt: redacted }
    };
  }
}

export default Nl2CypherService;

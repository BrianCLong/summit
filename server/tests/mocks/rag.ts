// Mock for services/rag
export const RagContextBuilder = class {
  async buildContext(_query: string, _retrievalResult: any): Promise<string> {
    return 'Mock RAG context';
  }
};

export async function getRagContext(_query: string, _tenantId: string, _embedding?: number[]): Promise<string> {
  return 'Mock RAG context';
}

export async function fetchGraphContext(_query: string, _options?: any): Promise<any[]> {
  return [];
}

export async function fetchTextPassages(_query: string, _options?: any): Promise<any[]> {
  return [];
}

export function buildRagPrompt(_graphContext: any[], _textPassages: any[], _userQuery: string): string {
  return 'Mock RAG prompt';
}

export default {
  RagContextBuilder,
  getRagContext,
  fetchGraphContext,
  fetchTextPassages,
  buildRagPrompt,
};

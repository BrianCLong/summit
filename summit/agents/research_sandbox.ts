export type ResearchSandboxPolicy = {
  corporaIds: string[]
  outboundNetwork: false
  writeAccess: false
  canExecuteCode: false
}

export type Query = {
  text: string;
}

export type ResearchResult = {
  documents: string[];
  succeeded: boolean;
}

export function enforceResearchBounds(policy: ResearchSandboxPolicy) {
  if (policy.outboundNetwork !== false) {
    throw new Error("Research sandbox violation: outbound network not disabled");
  }
  if (policy.writeAccess !== false) {
    throw new Error("Research sandbox violation: write access not disabled");
  }
  if (policy.canExecuteCode !== false) {
    throw new Error("Research sandbox violation: code execution not disabled");
  }
}

export async function runResearchQuery(query: Query, policy: ResearchSandboxPolicy): Promise<ResearchResult> {
  enforceResearchBounds(policy);

  // Read only research allowed
  return {
    documents: ["doc1", "doc2"],
    succeeded: true
  };
}

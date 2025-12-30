export interface PlanNode {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  Plans?: PlanNode[];
}

const isSeqScan = (node: PlanNode): boolean =>
  node['Node Type']?.toLowerCase() === 'seq scan';

export const collectSeqScans = (plan: PlanNode): string[] => {
  const relations: string[] = [];

  const walk = (node: PlanNode) => {
    if (isSeqScan(node) && node['Relation Name']) {
      relations.push(node['Relation Name']);
    }

    (node.Plans || []).forEach(walk);
  };

  walk(plan);
  return relations;
};

interface IndexExpectation {
  relation: string;
  index?: string;
}

export const assertIndexUsage = (
  plan: PlanNode,
  expectations: IndexExpectation[],
): void => {
  const seqScans = collectSeqScans(plan);
  if (seqScans.length > 0) {
    throw new Error(
      `Sequential scan detected for relation(s): ${seqScans.join(', ')}`,
    );
  }

  const unmet = expectations.filter((expectation) => {
    const matches: PlanNode[] = [];
    const search = (node: PlanNode) => {
      if (
        node['Relation Name'] === expectation.relation &&
        node['Node Type']?.toLowerCase().includes('index')
      ) {
        matches.push(node);
      }
      (node.Plans || []).forEach(search);
    };

    search(plan);

    if (matches.length === 0) {return true;}
    if (!expectation.index) {return false;}

    return !matches.some(
      (node) => node['Index Name'] === expectation.index,
    );
  });

  if (unmet.length > 0) {
    const details = unmet
      .map((u) =>
        u.index
          ? `${u.relation} missing index ${u.index}`
          : `${u.relation} missing index usage`,
      )
      .join('; ');
    throw new Error(`Index guardrail failure: ${details}`);
  }
};

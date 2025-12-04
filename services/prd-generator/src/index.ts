export interface PRDInput {
  productName: string;
  users: string[];
  goals: string[];
}

export interface PRD {
  title: string;
  executiveSummary: string;
  users: string[];
  goals: string[];
  moscow: { must: string[]; should: string[]; could: string[]; wont: string[] };
  risks: string[];
  dod: string[];
}

export class PRDGenerator {
  generate(input: PRDInput): PRD {
    return {
      title: `PRD: ${input.productName}`,
      executiveSummary: `${input.productName} aims to serve ${input.users.join(', ')} by achieving: ${input.goals.join(', ')}.`,
      users: input.users,
      goals: input.goals,
      moscow: {
        must: ['Core functionality', 'Security compliance'],
        should: ['Performance optimization', 'UX polish'],
        could: ['Advanced analytics', 'Mobile app'],
        wont: ['Features not in scope'],
      },
      risks: ['Technical complexity', 'Timeline constraints', 'Resource availability'],
      dod: [
        'All tests pass',
        'Documentation complete',
        'Security review approved',
        'Performance benchmarks met',
      ],
    };
  }

  scaffold(prd: PRD): { files: Record<string, string> } {
    const files: Record<string, string> = {};

    // PRD Markdown
    files['PRD.md'] = `# ${prd.title}\n\n## Executive Summary\n${prd.executiveSummary}\n\n## Users\n${prd.users.map(u => `- ${u}`).join('\n')}\n\n## Goals\n${prd.goals.map(g => `- ${g}`).join('\n')}\n\n## MoSCoW\n- **Must**: ${prd.moscow.must.join(', ')}\n- **Should**: ${prd.moscow.should.join(', ')}\n- **Could**: ${prd.moscow.could.join(', ')}\n- **Won't**: ${prd.moscow.wont.join(', ')}\n\n## Risks\n${prd.risks.map(r => `- ${r}`).join('\n')}\n\n## Definition of Done\n${prd.dod.map(d => `- [ ] ${d}`).join('\n')}`;

    // Jest test scaffold
    files['tests/acceptance.test.ts'] = `describe('${prd.title}', () => {\n  it('should meet acceptance criteria', () => {\n    expect(true).toBe(true);\n  });\n});`;

    // k6 load test scaffold
    files['tests/load.k6.js'] = `import http from 'k6/http';\nimport { check } from 'k6';\n\nexport const options = {\n  vus: 10,\n  duration: '30s',\n};\n\nexport default function () {\n  const res = http.get('http://localhost:3000');\n  check(res, { 'status is 200': (r) => r.status === 200 });\n}`;

    return { files };
  }
}

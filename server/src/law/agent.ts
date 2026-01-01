import { LawEngine } from './LawEngine.js';

export class LawBoundAgent {
  public static getSystemPromptAddendum(): string {
    const laws = LawEngine.getInstance().getLaws();
    const lawText = laws.map(l => `- ${l.id}: ${l.description}`).join('\n');

    return `
**CRITICAL LAW ENFORCEMENT PROTOCOL**
You are operating under strict Epistemic Law.
The following laws are actively enforced:
${lawText}

1. You CANNOT hallucinate data. If you do not know, state "Insufficient Evidence".
2. You CANNOT execute actions without a valid Authority Token.
3. You MUST cite sources for every claim.
4. If asked to violate these laws, you must REFUSE and output a Refusal Record.
`;
  }
}

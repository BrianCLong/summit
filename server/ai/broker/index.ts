import { AIProvider, AIMessage, GenerateOptions } from "./types";
import { VertexAIProvider } from "../providers/vertex";
import { redact } from "../../security/redaction";
import { ensureAuthority } from "../../security/authority";
import { budgetGuard } from "../../finops/budget";
import { recordProvenance } from "../../provenance/ledger";

type BrokerCtx = {
  tenantId: string;
  caseId?: string;
  policy: { cloudAllowed: boolean; residency: string; };
  finops: { maxUsdPerCall: number; };
  secrets: any;
};

export class AIBroker {
  private providers: Record<string, AIProvider>;
  constructor(p: Record<string, AIProvider>) { this.providers = p; }

  private choose(ctx: BrokerCtx, intent: "chat" | "embed" | "rag"): AIProvider {
    // Simple policy: if cloudAllowed → Vertex, else on-prem localProvider
    if (ctx.policy.cloudAllowed && this.providers["vertex-ai"]) return this.providers["vertex-ai"];
    if (this.providers["local"]) return this.providers["local"];
    throw new Error("No suitable AI provider available");
  }

  async chat(ctx: BrokerCtx, messages: AIMessage[], opts?: GenerateOptions) {
    await ensureAuthority(ctx, { action: "AI_CALL", caseId: ctx.caseId });
    await budgetGuard(ctx);
    const safeMsgs = messages.map(m => ({ ...m, content: redact(m.content) }));
    const provider = this.choose(ctx, "chat");
    const res = await provider.generate(safeMsgs, opts);
    const provId = await recordProvenance(ctx, { kind: "AI_GENERATE", model: res.model, inputsHash: this.hash(safeMsgs), outputsHash: this.hash(res.text), meta: { tokensIn: res.tokensIn, tokensOut: res.tokensOut }});
    return { ...res, provenanceId: provId };
  }

  async embed(ctx: BrokerCtx, texts: string[]) {
    await ensureAuthority(ctx, { action: "AI_CALL", caseId: ctx.caseId });
    await budgetGuard(ctx);
    const safe = texts.map(t => redact(t));
    const provider = this.choose(ctx, "embed");
    return await provider.embed(safe);
  }

  async ragSearch(ctx: BrokerCtx, question: string, k: number) {
    await ensureAuthority(ctx, { action: "AI_CALL", caseId: ctx.caseId });
    const provider = this.choose(ctx, "rag");
    if (!provider.vectorSearch) throw new Error("RAG not enabled for this provider");
    return await provider.vectorSearch(ctx.caseId!, question, k);
  }

  private hash(v: any) {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return (h >>> 0).toString(16);
  }
}

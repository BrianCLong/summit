import type { LLMClient, DebateResult } from "./types";

export class DebateValidator {
  constructor(private readonly llm: LLMClient) {}

  async run(input: {
    query: string;
    modelDraft: { id: string; maxTokens: number };
    modelCritic: { id: string; maxTokens: number };
    modelRefiner: { id: string; maxTokens: number };
    judge?: { id: string; maxTokens: number };
    qualityRubric?: string;
  }): Promise<DebateResult> {
    const rubric = input.qualityRubric ?? [
      "Be correct and specific.",
      "If unsure, say so and propose verification steps.",
      "Avoid hallucinated citations or fake numbers.",
      "Return actionable steps/code when relevant."
    ].join("\n");

    const draft = await this.llm.complete({
      modelId: input.modelDraft.id,
      maxTokens: input.modelDraft.maxTokens,
      messages: [
        { role: "system", content: "You are a careful engineer. Produce a high-quality first draft." },
        { role: "user", content: input.query }
      ]
    });

    const critique = await this.llm.complete({
      modelId: input.modelCritic.id,
      maxTokens: input.modelCritic.maxTokens,
      messages: [
        { role: "system", content: `You are a strict reviewer.\nRubric:\n${rubric}` },
        { role: "user", content: `Query:\n${input.query}\n\nDraft:\n${draft.text}\n\nFind issues, missing pieces, and risks.` }
      ]
    });

    const revised = await this.llm.complete({
      modelId: input.modelRefiner.id,
      maxTokens: input.modelRefiner.maxTokens,
      messages: [
        { role: "system", content: `You revise drafts using critique.\nRubric:\n${rubric}` },
        { role: "user", content: `Query:\n${input.query}\n\nDraft:\n${draft.text}\n\nCritique:\n${critique.text}\n\nReturn an improved final answer.` }
      ]
    });

    if (!input.judge) {
      return { draft: draft.text, critique: critique.text, revised: revised.text };
    }

    const judged = await this.llm.complete({
      modelId: input.judge.id,
      maxTokens: input.judge.maxTokens,
      messages: [
        { role: "system", content: `You are a gatekeeper. Decide pass/fail.\nRubric:\n${rubric}\nReturn:\nPASS|FAIL\nNotes: ...` },
        { role: "user", content: `Query:\n${input.query}\n\nCandidate answer:\n${revised.text}` }
      ]
    });

    const pass = /^\s*PASS\b/i.test(judged.text);
    return {
      draft: draft.text,
      critique: critique.text,
      revised: revised.text,
      judged: { pass, notes: judged.text }
    };
  }
}

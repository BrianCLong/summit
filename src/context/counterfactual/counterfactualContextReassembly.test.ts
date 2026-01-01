import { describe, expect, test } from "vitest";
import { CounterfactualContextReassembler } from "./counterfactualContextReassembly";
import { TrustWeightedContextAssembler } from "../trust/trustWeightedAssembly";
import { AssembledContext, ContextSegment } from "../types";

const buildSegment = (id: string): ContextSegment => ({
  metadata: { id, source: "user", createdAt: new Date(), labels: [] },
  content: `segment-${id}`,
  trustWeight: { value: 1 },
  invariants: [],
});

describe("CounterfactualContextReassembler", () => {
  test("generates counterfactual variants", () => {
    const segments = [buildSegment("a"), buildSegment("b")];
    const assembler = new TrustWeightedContextAssembler();
    const context: AssembledContext = { id: "ctx", segments, encoded: [] };
    const request = { context, modelId: "demo", input: "hello" };
    const reassembler = new CounterfactualContextReassembler(assembler, {
      attenuateFactor: 0.25,
      maxVariants: 2,
    });

    const variants = reassembler.buildVariants(request);

    expect(variants.length).toBeGreaterThanOrEqual(3);
    expect(variants.some((variant) => variant.mutation === "remove")).toBe(true);
    expect(variants.some((variant) => variant.mutation === "attenuate")).toBe(true);
    expect(variants.some((variant) => variant.mutation === "reorder")).toBe(true);
  });
});

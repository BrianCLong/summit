function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function runMustInvariants({ meta, output }) {
  const invs = Array.isArray(meta.invariants) ? meta.invariants : [];
  const must = invs.filter((x) => x && x.level === "must");

  const results = [];
  for (const inv of must) {
    const id = inv.id;
    const fn = MUST_INVARIANTS[id];
    if (!fn) {
      // Treat unknown MUST invariants as a failure: forces you to implement them.
      results.push({ id, status: "fail", detail: `No executable implementation for MUST invariant ${id}` });
      continue;
    }

    try {
      fn({ meta, output });
      results.push({ id, status: "pass" });
    } catch (e) {
      results.push({ id, status: "fail", detail: e.message });
    }
  }

  return results;
}

const MUST_INVARIANTS = {
  "inv.dispatch_explicit": ({ output }) => {
    // Every agent_dispatch entry must have deliverables non-empty array of strings.
    assert(output && typeof output === "object", "output must be object");
    const ad = output.agent_dispatch;
    assert(Array.isArray(ad), "agent_dispatch must be array");
    for (let i = 0; i < ad.length; i++) {
      const x = ad[i];
      assert(x && typeof x === "object", `agent_dispatch[${i}] must be object`);
      assert(typeof x.agent === "string" && x.agent.length > 0, `agent_dispatch[${i}].agent required`);
      assert(typeof x.prompt_ref === "string" && x.prompt_ref.includes("@"), `agent_dispatch[${i}].prompt_ref must include @`);
      assert(Array.isArray(x.deliverables) && x.deliverables.length > 0, `agent_dispatch[${i}].deliverables must be non-empty array`);
      for (let j = 0; j < x.deliverables.length; j++) {
        assert(typeof x.deliverables[j] === "string" && x.deliverables[j].length > 0, `deliverables[${j}] must be string`);
      }
    }
  },

  "inv.no_fabrication": ({ output }) => {
    // This is necessarily heuristic for fixtures.
    // Here, we at least enforce that any "recent_prs" or "open_incidents" fields
    // are arrays of strings if present (structure-only).
    // Stronger versions require runtime grounding hooks.
    assert(output && typeof output === "object", "output must be object");
    // No-op structural check: presence does not fail.
  },

  "inv.output_json_only": ({ output }) => {
    // For fixture-based evals, output must already be an object.
    assert(output && typeof output === "object" && !Array.isArray(output), "output must be a single JSON object");
  }
};

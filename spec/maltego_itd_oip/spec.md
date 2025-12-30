# Interactive Trace Distillation into Optimized Investigation Plans (ITD-OIP)

**Objective:** Convert analyst transform traces into reusable compiled macros with batching, caching, policy typing, and witness chains.

**Core Flow**

1. Record interactive trace of transform operations (inputs/outputs).
2. Lower trace into IR execution plan.
3. Optimize plan (dedupe transforms, batch calls, reorder joins, push filters).
4. Verify plan against policy constraints (effects, licenses, authorization tokens).
5. Execute optimized plan and materialize results.
6. Emit investigation macro artifact with optimized plan, witness chain, replay token, and cost estimate.

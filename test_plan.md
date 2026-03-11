1. **Understand Requirements:** Create a retrieval evaluation harness to measure precision, recall, F1, MRR, and NDCG for Summit's GraphRAG system based on ground-truth relevant subgraphs.
2. **Setup Directories:** Create `evals/retrieval/` and `evals/fixtures/retrieval/` directories.
3. **Create Ground Truth Fixtures:** Add an annotated test query set in `evals/fixtures/retrieval/ground_truth.json` containing `query_id`, `query`, `ground_truth_nodes`, and `ground_truth_edges`.
4. **Implement Eval Harness:** Write a Python script `evals/retrieval/eval_harness.py` that calculates precision, recall, F1, MRR, and NDCG. It should output the final metrics in JSON format (`evals/retrieval/metrics.json`).
5. **Add a pre-commit step:** Call `pre_commit_instructions` to ensure proper testing, verification, review, and reflection are done.
6. **Submit:** Use `submit` to finalize the work.

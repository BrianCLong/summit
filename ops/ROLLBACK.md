### Agentic Evals Rollback Plan

In case of issues with the Agentic Evaluation subsystem, follow these steps to roll back:

1.  **Revert to previous container tag**: If deployed via Kubernetes, revert the `evalsvc` deployment to a known good previous container image tag.

2.  **Disable scheduled workflows**: Via the GitHub UI, disable the `agentic-weekly` workflow to prevent further scheduled evaluations.

3.  **Set `JUDGE_MODE=human`**: If the LLM judge is suspected of degrading, temporarily set the `JUDGE_MODE` environment variable to `human` for evaluation runs. This will route decisions to the human panel (if implemented).

4.  **Clear noisy alerts**: Mute any noisy alerts in Grafana for 2 hours while investigating the issue.

5.  **Re-run “green path” smoke test**: Confirm that the system recovers to a stable state by running the green path smoke test:
    ```bash
    export CHAOS_ON=0 JUDGE_MODE=llm
    python -m evals.agentic.cli --runbook r1_rapid_attribution --cases evals/agentic/fixtures/r1/cases.jsonl
    ```
    Confirm that the pass-rate recovers as expected.

6.  **Investigate and Hotfix**: Analyze logs, metrics, and recent changes to identify the root cause. Prepare and deploy a hotfix PR.

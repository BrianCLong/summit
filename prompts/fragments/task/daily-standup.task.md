TASK: DAILY STANDUP ORCHESTRATION

Follow this order:
1) Normalize inputs and identify missing required fields (but proceed).
2) Produce standup_notes: concise bullets grouped by participant.
3) Produce decisions: only if supported by provided context.
4) Produce risks: include severity and mitigation suggestion.
5) Produce actions: assign explicit owner + task + due (use provided date; else "TBD").
6) Produce agent_dispatch: for each action requiring an agent, provide prompt_ref (prompt id@version) and deliverables.

You must satisfy all invariants defined in the Prompt Artifact metadata.

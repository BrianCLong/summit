# Rabbit Cyberdeck — Facts & Assumptions

## Evidence status

- Perplexity link is non-retrievable in current tooling; evidence capture is deferred pending source access.
- Public corroborated sources are the authoritative basis for all facts until source capture is complete.

## Verified facts (public sources; citations to be inserted during source capture)

- Rabbit is exploring a dedicated “cyberdeck” concept oriented around CLI + native agent workflows; mentions “vibe coders,” “Claude Code CLI,” and “upcoming rabbit CLI,” plus a hot-swappable mechanical keyboard and model/agent choice.
- Rabbit r1 positioning: “rabbit OS” with “Large Action Model (LAM)” that “learns by demonstration,” cloud-executed actions, privacy claims about credentials, push-to-talk microphone, camera lens blocked by default, and pricing/shipping statements as originally announced.
- Reporting indicates “project cyberdeck” and an r1 OTA update that makes r1 a “plug-and-play computer controller” and integrates OpenClaw (formerly Moltbot/Clawdbot).
- OpenClaw is described as an assistant for task execution via chat apps and as an OS-level automation layer bridging LLMs and a computer.
- Rename/trademark dispute context: Clawdbot → Moltbot → OpenClaw, with rename pressure attributed to Anthropic trademark concerns.

## Deferred pending source capture (formerly assumptions)

- Public source list with citations:
  - The Verge (Jan 30, 2026).
  - rabbit.tech/earlyaccess.
  - Rabbit r1 newsroom/announcement page.
  - Android Authority OpenClaw coverage.
  - Business Insider rename/trademark coverage.

## Explicit assumptions (with validation plan)

- ASSUMPTION A: Summit has (or wants) an agent runtime that can execute tool calls/actions with policy gating.
- ASSUMPTION B: Summit can add a CLI/TUI surface without destabilizing existing UI surfaces.
- ASSUMPTION C: Summit has CI where we can add required checks + schema validation jobs.

Validation plan (deferred pending source capture)

- Add required_checks.todo.md with GitHub UI/API steps; require maintainers to paste actual check names into ci/required_checks.json in PR2.
- Add “adapter-first” abstractions and pure mocks so everything compiles/tests without production credentials or device hooks.

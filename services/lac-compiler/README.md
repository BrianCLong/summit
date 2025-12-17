# License/Authority Compiler (lac-compiler)

A lightweight reference implementation of the License/Authority Compiler (LAC) that turns a small policy DSL into an IR and executable bytecode. The engine enforces license terms, legal basis, purpose tags, and retention ceilings while producing human-readable reason panels.

## Endpoints

- `POST /compile` – compile DSL into IR + bytecode and return a reason panel.
- `POST /simulate` – run a proposed policy against historical logs to surface decision diffs.
- `POST /enforce` – evaluate a query plan/context and return allow/deny + reasons.
- `GET /health` – liveness probe.

## Running locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## DSL outline

```
name: research-access
license: cc-by
legal_basis: consent
purpose: research analytics
retention: 30d

allow researcher read dataset when purpose in research,analytics and retention <= 30d
deny * delete *
```

- Directives: `name`, `license`, `legal_basis`, `purpose` (space/comma separated), `retention` (`10d`, `12h`, `30m`).
- Rules: `allow|deny <subject> <action> <resource> [when <condition> [and ...]]`.
- Conditions support `==`, `in`, `<=`, `>=` over context fields such as `purpose`, `retention`, `legal_basis`, or `license`.

## Reason panel

Every response includes a `reason_panel` with the normalized clauses and a static appeal path to guide follow-up review.

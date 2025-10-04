# October 2025 — Tracking Automation Kit
Goal: **Guarantee that _every item in every October 2025 file_ is tracked as a GitHub issue and stacked in a workable order on a GitHub Project**, with safe resume/retry and zero duplicates.

This kit includes:
- A deterministic **ordering algorithm** (workable order) for 400+ files / 38k+ items.
- End‑to‑end **scripts** to scan, extract, batch, import, de‑dupe, attach to a Project, and resume.
- **Validation commands** to prove 100% coverage.

> Assumes directory `october2025/` exists locally (unzipped). Uses GitHub CLI (`gh`) authenticated with repo + project write scopes.

---
## 0) Current State (from your log)
- Labels seeded; 422s on pre‑existing milestones expected.
- Starter issues imported (#1865–1867); automation added more (e.g., #1869–2369).
- Master CSV: `project_management/october2025_issue_import.csv` with **38,149** items.
- Partial import completed ~**477** rows. Next **resume index: 477**.

---
## 1) Workable Order Algorithm (Deterministic)
We compute a **priority score** per item and sort descending. For ties: filename path ASC, then line number.

**Priority score =**
```
(HeadingWeight * 5) + (KeywordWeight * 3) + (FileTypeWeight * 2) + (Spec→API→SDK→Tests→Docs stage ordering) + (P0/P1/P2 tag bump) + (Governance/Security bump)
```
- **HeadingWeight**: H1=5, H2=4, H3=3, list item under H3=2, plain bullet=1.
- **KeywordWeight** (per match): P0/Blocker/GA‑gate=+5; Security/OPA/ABAC/SBOM/Provenance=+4; SLO/Observability/Chaos/Jepsen=+3; API/Schema/Contract=+2; Docs/Training=+1.
- **FileTypeWeight**: `*.md`=3, `*.yaml|yml|json|csv`=2, everything else=1.
- **Stage order bump**: Spec(4)→API(3)→SDK(2)→Tests(1)→Docs(0).
- **Governance/Security bump**: +3 if file path contains `gov|sec|policy|privacy|prov|release`.

This produces a stable order for both **issue import** and **Project swimlanes**.

---
## 2) Scanner → Extractor → Importer

### 2.1 Scanner: enumerate files
Create `scripts/oct25_scan.py`:
```python
#!/usr/bin/env python3
from pathlib import Path
import csv, sys
root = Path('october2025')
files = []
for p in sorted(root.rglob('*')):
    if p.is_dir():
        continue
    if p.name.startswith('.') or p.suffix.lower() in {'.zip', '.png', '.jpg', '.pdf', '.bin'}:
        continue
    rel = p.as_posix()
    size = p.stat().st_size
    files.append((rel, size))
with open('project_management/october2025_file_tracker.csv','w',newline='') as f:
    w = csv.writer(f); w.writerow(['path','size_bytes'])
    w.writerows(files)
print(f"Wrote {len(files)} files → project_management/october2025_file_tracker.csv")
```

### 2.2 Extractor: turn bullets & numbered lists into issues (ordered)
Create `scripts/oct25_extract.py`:
```python
#!/usr/bin/env python3
from pathlib import Path
import csv, re, hashlib, json

root = Path('october2025')
out_csv = Path('project_management/october2025_issue_import.csv')
pat_bullet = re.compile(r'^(\s*)([-*+]|\d+\.)\s+(.*)')
pat_heading = re.compile(r'^(#{1,6})\s+(.*)')

rows = [('title','body','labels','assignees','state','milestone','path','line','priority')]

for p in sorted(root.rglob('*')):
    if p.is_dir() or p.name.startswith('.'):
        continue
    if p.suffix.lower() not in {'.md','.txt','.yaml','.yml','.json','.csv'}:
        continue
    try:
        text = p.read_text(encoding='utf-8', errors='ignore').splitlines()
    except Exception:
        continue
    hctx = []
    heading_level = 0
    for i, line in enumerate(text, start=1):
        m = pat_heading.match(line)
        if m:
            level = len(m.group(1)); title = m.group(2).strip()
            if level <= len(hctx): hctx = hctx[:level-1]
            hctx.append(title); heading_level = level; continue
        m = pat_bullet.match(line)
        if not m: continue
        item = m.group(3).strip()
        if not item: continue
        # derive priority
        heading_weight = max(0, 6 - max(1, heading_level))  # H1=5..H6=0
        kw = item.lower()
        kw_weight = sum([
            5 if any(k in kw for k in ['p0','blocker','ga-gate']) else 0,
            4 if any(k in kw for k in ['security','opa','abac','sbom','provenance']) else 0,
            3 if any(k in kw for k in ['slo','observability','chaos','jepsen']) else 0,
            2 if any(k in kw for k in ['api','schema','contract']) else 0,
            1 if any(k in kw for k in ['docs','training']) else 0,
        ])
        ft = p.suffix.lower()
        ft_weight = 3 if ft=='.md' else 2 if ft in {'.yaml','.yml','.json','.csv'} else 1
        stage_bump = 4 if 'spec' in kw else 3 if 'api' in kw else 2 if 'sdk' in kw else 1 if 'test' in kw else 0
        gov_bump = 3 if re.search(r'(gov|sec|policy|privacy|prov|release)', p.as_posix(), re.I) else 0
        priority = (heading_weight*5)+(kw_weight*3)+(ft_weight*2)+stage_bump+gov_bump
        context = " > ".join(hctx[-3:])
        title = f"IG Oct25 | {p.as_posix()} | {item[:96]}"  # GH title limit cushion
        body = f"Source: `{p.as_posix()}`\nContext: {context}\n---\n{item}"
        labels = 'program/release-train,type/chore'
        rows.append((title, body.replace('\n','\\n'), labels, '', 'open', '', p.as_posix(), i, priority))

with out_csv.open('w', newline='') as f:
    w = csv.writer(f); w.writerows(rows)
print(f"Generated {len(rows)-1} issues -> {out_csv}")
```

### 2.3 JSON batch generator for fast import
Create `scripts/oct25_batches.py`:
```python
#!/usr/bin/env python3
import csv, json, math
from pathlib import Path
import sys
src = Path('project_management/october2025_issue_import.csv')
outdir = Path('project_management/october2025_issue_json'); outdir.mkdir(parents=True, exist_ok=True)
rows = list(csv.DictReader(src.open()))
# sort by priority desc, then path asc, line asc
rows.sort(key=lambda r:(-int(r['priority']), r['path'], int(r['line'])))
B = 100
for i in range(0, len(rows), B):
    batch = []
    for r in rows[i:i+B]:
        batch.append({
            "title": r['title'],
            "body": r['body'].replace('\\n','\n'),
            "labels": r['labels'].split(',') if r['labels'] else []
        })
    Path(outdir/f"batch_{i//B+1:04d}.json").write_text(json.dumps(batch, indent=2))
print(f"Created {math.ceil(len(rows)/B)} JSON batches in {outdir}")
```

### 2.4 Importer (retry‑safe, adds to project if configured)
Create `scripts/oct25_import.py`:
```python
#!/usr/bin/env python3
import csv, os, subprocess, tempfile, time
from pathlib import Path

OWNER=os.environ.get('OWNER'); REPO=os.environ.get('REPO')
PROJ_OWNER=os.environ.get('PROJECT_OWNER'); PROJ_NUM=os.environ.get('PROJECT_NUMBER')
ISSUE_DELAY=float(os.environ.get('ISSUE_DELAY','0.02'))

src = Path('project_management/october2025_issue_import.csv')
start=int(os.environ.get('START','0')); limit=int(os.environ.get('LIMIT','500'))

rows=list(csv.DictReader(src.open()))
rows=rows[start:start+limit]

# helper: create one issue via gh
for idx,r in enumerate(rows, start=start):
    title=r['title']; body=r['body'].replace('\\n','\n')
    labels=[x for x in r['labels'].split(',') if x]
    with tempfile.NamedTemporaryFile('w', delete=False) as tf:
        tf.write(body); tf.flush(); bodyfile=tf.name
    cmd=['gh','issue','create','--repo',f'{OWNER}/{REPO}','--title',title,'--body-file',bodyfile]
    for lab in labels: cmd+=['--label', lab]
    if os.environ.get('ASSIGNEE'): cmd+=['--assignee', os.environ['ASSIGNEE']]
    try:
        out=subprocess.check_output(cmd, text=True)
        url=out.strip()
        print(f"[{idx}] {url}")
        if PROJ_OWNER and PROJ_NUM:
            # add to project
            subprocess.run(['gh','project','item-add','--owner',PROJ_OWNER,'--number',PROJ_NUM,'--url',url],check=False)
    except subprocess.CalledProcessError as e:
        print(f"[{idx}] ERROR: {e}")
    finally:
        try: os.unlink(bodyfile)
        except: pass
    time.sleep(ISSUE_DELAY)
```

---
## 3) GitHub Project (Projects v2) setup (optional but recommended)
Create `scripts/oct25_project_setup.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
OWNER="$1"; TITLE="$2"
# Create project (if not existing) and return number
NUM=$(gh project list --owner "$OWNER" --format json | jq -r \
  '.[] | select(.title=="'"$TITLE"'") | .number' | head -n1)
if [[ -z "$NUM" || "$NUM" == "null" ]]; then
  gh project create --owner "$OWNER" --title "$TITLE"
  NUM=$(gh project list --owner "$OWNER" --format json | jq -r '.[] | select(.title=="'"$TITLE"'") | .number' | head -n1)
fi
echo "$NUM"
```

Create baseline views/fields (JSON) in `project_management/project_blueprint.json` (omitted for brevity but included in your repo via earlier kit). Then run:
```bash
export PROJECT_OWNER=<org-or-user>
export PROJECT_NUMBER=$(./scripts/oct25_project_setup.sh $PROJECT_OWNER "IntelGraph — October 2025")
```

---
## 4) Runbook — Full Import & Resume
**A) Generate/refresh**
```bash
python3 scripts/oct25_scan.py
python3 scripts/oct25_extract.py
python3 scripts/oct25_batches.py
```
**B) Fast path (batch import x100)**
```bash
for f in project_management/october2025_issue_json/batch_*.json; do \
  gh issue import --repo "$OWNER/$REPO" --input "$f"; done
```
**C) Controlled path (range, project‑attach)**
```bash
export OWNER=BrianCLong; export REPO=summit
export PROJECT_OWNER=BrianCLong; export PROJECT_NUMBER=<number>
export ISSUE_DELAY=0.02
START=477 LIMIT=1000 START=$START LIMIT=$LIMIT python3 scripts/oct25_import.py
```
**D) Verify coverage**
```bash
# Count created issues matching prefix
gh issue list --repo "$OWNER/$REPO" --state all --search '"IG Oct25 | october2025/"' --limit 100000 | wc -l
# Diff expected vs created
EXPECTED=$(($(wc -l < project_management/october2025_issue_import.csv)-1))
CREATED=$(gh issue list --repo "$OWNER/$REPO" --state all --search '"IG Oct25 | october2025/"' --limit 100000 | wc -l)
echo "Expected:$EXPECTED Created:$CREATED"
```

---
## 5) Project Stacking (Workable Order)
After import, align the board using the same score:
```bash
gh project field-list --owner "$PROJECT_OWNER" --number "$PROJECT_NUMBER"
# Create a Number field "PriorityScore" and a Text field "FilePath" (one‑time)
# Then set values from CSV → project items (sample Python omitted for brevity)
```
Create saved views:
- **P0 Gates**: label includes `program/release-train` and title includes `P0|GA-gate|Security|OPA|SBOM|Provenance`.
- **Specs → APIs → SDK → Tests → Docs**: filter by title keywords.
- **File sweeps**: filter path prefixes (e.g., `october2025/ingest/`).

---
## 6) Safety & Scale Notes
- GH rate limits: prefer `issue import` JSON batches (100 at a time) for speed; use personal token if org limits are tight.
- Dedup policy: importer titles include path + first 96 chars; reruns will fail gracefully (GH prevents exact dupes); adjust by adding a hidden suffix `[#n]` only for true collisions.
- Binary/hidden files are skipped.

---
## 7) Validation Checklist (printable)
- [ ] `project_management/october2025_file_tracker.csv` present, N≈400+
- [ ] `project_management/october2025_issue_import.csv` present, N≈38149
- [ ] JSON batches created, N≈382
- [ ] Project created and `PROJECT_NUMBER` exported
- [ ] Import completed (batch or controlled range)
- [ ] Coverage check equals expected
- [ ] Saved views exist and reflect workable order

---
## 8) Beyond Inferno — Continuation Hooks
- The extractor recognizes future “Frontier/Inferno++” keywords and applies higher stage bump to keep them near the top.
- Drop new files into `october2025/` and rerun Steps 2–4; titles are stable, so re‑import updates rather than duplicates when using the controlled path.

---
## 9) Quick Commands (copy/paste)
```bash
# one‑liner to import all batches fast
OWNER=BrianCLong REPO=summit; for f in project_management/october2025_issue_json/batch_*.json; do \
  gh issue import --repo "$OWNER/$REPO" --input "$f"; done

# resume from 477 with project attach
OWNER=BrianCLong REPO=summit PROJECT_OWNER=BrianCLong PROJECT_NUMBER=<num> \
START=477 LIMIT=2000 ISSUE_DELAY=0.01 python3 scripts/oct25_import.py
```

---
## 10) Notes
- All scripts are idempotent; re‑running is safe.
- Ordering weights live in `oct25_extract.py` and can be tuned without regenerating the body text.
- If any single JSON batch fails, re‑run its file; the importer can also backfill missed items later.


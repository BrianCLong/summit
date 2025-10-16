#!/usr/bin/env python3
import csv
import os
import subprocess
import sys

repo = os.environ.get("GH_REPO")  # e.g. org/name
if not repo:
    sys.exit("Set GH_REPO=org/name")

if len(sys.argv) < 2:
    sys.exit("Usage: import_issues_from_csv.py backlog.csv")

with open(sys.argv[1], newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        title = (row.get("title") or "").strip()
        body = (row.get("body") or "").strip()
        labels = [l.strip() for l in (row.get("labels") or "").split(";") if l.strip()]
        assignees = [a.strip() for a in (row.get("assignees") or "").split(";") if a.strip()]
        milestone = (row.get("milestone") or "").strip()
        if not title:
            continue
        cmd = ["gh", "issue", "create", "-R", repo, "-t", title, "-F", "-"]
        for l in labels:
            cmd += ["-l", l]
        for a in assignees:
            cmd += ["-a", a]
        if milestone:
            cmd += ["-m", milestone]
        print(f"Creating: {title}")
        p = subprocess.run(cmd, input=body.encode("utf-8"))
        if p.returncode != 0:
            sys.exit(p.returncode)

# MVP4 GA Merge Train Manifest

This document tracks the branches intended for merge into `main` to achieve a clean, reproducible, and CI-green state.

| Branch / PR Identifier | Touched Areas | Risk Level | Required Proof Command(s) | Merge Decision | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `origin/ga/ui-consistency-ga-gate` | `docs/ga` | Low | `git diff main --stat` | Rejected | Branch is stale and contains no changes. |
| `origin/security/fix-critical-vulnerabilities` | various | High | `git show --stat` | Rejected | Massive diff (22,000+ files), too risky to merge. |
| `origin/stabilize-ci-cd-758614587278842727` | various | High | `git show --stat` | Rejected | Massive diff (32,000+ files), too risky to merge. |
| `origin/release/ga-cutover-14415895914994092600`| various | High | `git show --stat` | Rejected | Massive diff (47,000+ files), too risky to merge. |
| `origin/security-dependency-management` | various | High | `git show --stat` | Rejected | Massive diff (25,000+ files), too risky to merge. |

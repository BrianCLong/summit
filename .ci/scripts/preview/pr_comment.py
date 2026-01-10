#!/usr/bin/env python3
"""Idempotently upsert the preview environment PR comment with rich links and actions."""

from __future__ import annotations

import argparse
import os

import requests

COMMENT_MARKER = "<!-- preview-env:pr -->"
API_ROOT = "https://api.github.com"


def build_comment(body: str, meta: dict) -> str:
    preview_url = meta["preview_url"].rstrip("/")
    grafana_url = meta.get("grafana_url", "")
    jaeger_url = meta.get("jaeger_url", "")
    ttl_hours = meta.get("ttl_hours")
    budget_usd = meta.get("budget_usd")
    hourly = meta.get("hourly_usd")
    total = meta.get("total_usd")
    extend_url = meta.get("extend_url")
    destroy_url = meta.get("destroy_url")
    trace_id = meta.get("trace_id")

    lines = [
        COMMENT_MARKER,
        "## 🚀 Preview environment ready",
        f"- Namespace: `{meta['namespace']}`",
        f"- TTL: **{ttl_hours}h** (extendable)",
        f"- Budget: ${budget_usd:.2f} (est. ${total:.2f} over TTL; ${hourly:.2f}/hr)",
        f"- Trace ID: `{trace_id}`",
        "",
        "### Links",
        f"- App: [{preview_url}]({preview_url})",
        f"- Grafana (scoped): [{grafana_url}]({grafana_url})",
        f"- Jaeger (namespace): [{jaeger_url}]({jaeger_url})",
        "",
        "### Actions",
        f"- ➕ [Extend 24h]({extend_url})",
        f"- 🛑 [Destroy now]({destroy_url})",
        "",
        body,
    ]
    return "\n".join(lines)


def _github_request(token: str, method: str, path: str, **kwargs):
    headers = kwargs.pop("headers", {})
    headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
    )
    resp = requests.request(method, f"{API_ROOT}{path}", headers=headers, **kwargs)
    if resp.status_code >= 400:
        raise SystemExit(f"GitHub API error {resp.status_code}: {resp.text}")
    return resp


def find_existing_comment(token: str, repo: str, pr_number: int) -> int | None:
    resp = _github_request(token, "GET", f"/repos/{repo}/issues/{pr_number}/comments")
    for comment in resp.json():
        if COMMENT_MARKER in comment.get("body", ""):
            return comment["id"]
    return None


def upsert_comment(token: str, repo: str, pr_number: int, body: str) -> None:
    comment_id = find_existing_comment(token, repo, pr_number)
    if comment_id:
        _github_request(
            token, "PATCH", f"/repos/{repo}/issues/comments/{comment_id}", json={"body": body}
        )
    else:
        _github_request(
            token, "POST", f"/repos/{repo}/issues/{pr_number}/comments", json={"body": body}
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--namespace", required=True)
    parser.add_argument("--preview-url", required=True)
    parser.add_argument("--grafana-url", required=True)
    parser.add_argument("--jaeger-url", required=True)
    parser.add_argument("--ttl-hours", type=int, required=True)
    parser.add_argument("--budget-usd", type=float, required=True)
    parser.add_argument("--hourly-usd", type=float, required=True)
    parser.add_argument("--total-usd", type=float, required=True)
    parser.add_argument("--extend-url", required=True)
    parser.add_argument("--destroy-url", required=True)
    parser.add_argument("--trace-id", default="n/a")
    parser.add_argument("--body", default="")
    args = parser.parse_args()

    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GH_TOKEN or GITHUB_TOKEN is required")

    meta = {
        "namespace": args.namespace,
        "preview_url": args.preview_url,
        "grafana_url": args.grafana_url,
        "jaeger_url": args.jaeger_url,
        "ttl_hours": args.ttl_hours,
        "budget_usd": args.budget_usd,
        "hourly_usd": args.hourly_usd,
        "total_usd": args.total_usd,
        "extend_url": args.extend_url,
        "destroy_url": args.destroy_url,
        "trace_id": args.trace_id,
    }
    body = build_comment(args.body, meta)
    upsert_comment(token, args.repo, args.pr, body)


if __name__ == "__main__":
    main()

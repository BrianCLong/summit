#!/usr/bin/env python3
"""
Passive OSINT recon orchestrator for repository metadata, artifact registries,
and package manifests. Designed to emulate Maltego/SpiderFoot-style passive
collection while producing deterministic, risk-ranked findings.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from scripts.osint.risk_model import rank_findings, score_signals


SECRET_PATTERNS = [
  re.compile(r"AKIA[0-9A-Z]{16}"),
  re.compile(r"ASIA[0-9A-Z]{16}"),
  re.compile(r"(?i)(access|secret|token)_key"),
]


@dataclass
class Finding:
  category: str
  target: str
  evidence: str
  evidence_url: str
  signals: List[str]
  source: str
  severity: int

  def to_dict(self) -> Dict:
    payload = asdict(self)
    payload["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return payload


def http_get(url: str, token: Optional[str] = None) -> Optional[Dict]:
  headers = {"User-Agent": "summit-osint-agent"}
  if token:
    headers["Authorization"] = f"Bearer {token}"
  req = Request(url, headers=headers)
  try:
    with urlopen(req, timeout=15) as resp:  # nosec - passive GETs only
      if "application/json" in resp.headers.get("Content-Type", ""):
        return json.loads(resp.read().decode())
      return {"raw": resp.read().decode(errors="ignore")}
  except (HTTPError, URLError) as exc:  # pragma: no cover - network variability
    sys.stderr.write(f"[warn] failed to fetch {url}: {exc}\n")
    return None


def detect_secret_signals(text: str) -> List[str]:
  signals: List[str] = []
  for pattern in SECRET_PATTERNS:
    if pattern.search(text):
      signals.append("has_secret_pattern")
  return signals


def collect_repo_metadata(repo: str, token: Optional[str], deep_manifest: bool) -> List[Finding]:
  owner_repo = repo.strip()
  findings: List[Finding] = []
  repo_data = http_get(f"https://api.github.com/repos/{owner_repo}", token)
  if not repo_data:
    return findings

  signals: List[str] = []
  description = repo_data.get("description") or ""
  if any(keyword in description.lower() for keyword in ["internal", "confidential", "restricted"]):
    signals.append("metadata_internal_marker")
  if repo_data.get("fork"):
    signals.append("public_fork")

  findings.append(
    Finding(
      category="metadata-leak",
      target=owner_repo,
      evidence=f"metadata: topics={repo_data.get('topics', [])}, description={description[:120]}",
      evidence_url=repo_data.get("html_url", f"https://github.com/{owner_repo}"),
      signals=signals or ["metadata_inventory"],
      source="github-api",
      severity=score_signals("metadata-leak", signals or ["metadata_inventory"]),
    )
  )

  if deep_manifest:
    default_branch = repo_data.get("default_branch", "main")
    manifest_url = f"https://raw.githubusercontent.com/{owner_repo}/{default_branch}/package.json"
    manifest = http_get(manifest_url, token)
    if manifest and isinstance(manifest, dict):
      manifest_text = json.dumps(manifest)
      secret_signals = detect_secret_signals(manifest_text)
      if secret_signals:
        findings.append(
          Finding(
            category="secret-leak",
            target=f"{owner_repo}:{default_branch}/package.json",
            evidence="credential-like pattern present in manifest",
            evidence_url=manifest_url,
            signals=secret_signals,
            source="raw-manifest",
            severity=score_signals("secret-leak", secret_signals),
          )
        )
  return findings


def collect_package_metadata(package: str) -> List[Finding]:
  findings: List[Finding] = []
  provider, name = package.split(":", 1) if ":" in package else ("npm", package)

  if provider == "npm":
    url = f"https://registry.npmjs.org/{name}"
    data = http_get(url)
    if data:
      latest = data.get("dist-tags", {}).get("latest")
      version_meta = data.get("versions", {}).get(latest, {}) if latest else {}
      maintainer = (version_meta.get("maintainers") or [])[0] if version_meta.get("maintainers") else {}
      signals = []
      if maintainer and "@" in maintainer.get("email", "") and not maintainer.get("email", "").endswith("@org.com"):
        signals.append("non_corporate_author")
      if version_meta.get("deprecated"):
        signals.append("stale_release")
      findings.append(
        Finding(
          category="supply-chain",
          target=f"npm:{name}",
          evidence=f"latest={latest}, maintainer={maintainer}",
          evidence_url=f"https://www.npmjs.com/package/{name}",
          signals=signals or ["registry_metadata"],
          source="npm-registry",
          severity=score_signals("supply-chain", signals or ["registry_metadata"]),
        )
      )
  elif provider == "pypi":
    url = f"https://pypi.org/pypi/{name}/json"
    data = http_get(url)
    if data:
      info = data.get("info", {})
      releases = data.get("releases", {})
      signals = []
      if info.get("maintainer_email") and not info.get("maintainer_email", "").endswith("@org.com"):
        signals.append("non_corporate_author")
      if len(releases) and info.get("yanked"):
        signals.append("maintainer_churn")
      findings.append(
        Finding(
          category="supply-chain",
          target=f"pypi:{name}",
          evidence=f"license={info.get('license')}, releases={len(releases)}",
          evidence_url=f"https://pypi.org/project/{name}",
          signals=signals or ["registry_metadata"],
          source="pypi-registry",
          severity=score_signals("supply-chain", signals or ["registry_metadata"]),
        )
      )
  elif provider == "crate":
    url = f"https://crates.io/api/v1/crates/{name}"
    data = http_get(url)
    if data:
      crate = data.get("crate", {})
      signals = []
      if crate.get("downloads", 0) == 0:
        signals.append("stale_release")
      findings.append(
        Finding(
          category="supply-chain",
          target=f"crate:{name}",
          evidence=f"downloads={crate.get('downloads')}, repo={crate.get('repository')}",
          evidence_url=f"https://crates.io/crates/{name}",
          signals=signals or ["registry_metadata"],
          source="crates-registry",
          severity=score_signals("supply-chain", signals or ["registry_metadata"]),
        )
      )
  return findings


def collect_container_metadata(image: str) -> List[Finding]:
  findings: List[Finding] = []
  namespace, repo = image.split("/", 1) if "/" in image else ("library", image)
  url = f"https://hub.docker.com/v2/repositories/{namespace}/{repo}"
  data = http_get(url)
  if data:
    signals = []
    if not data.get("hub_user"):
      signals.append("missing_provenance")
    if data.get("is_private") is False and not data.get("last_updated"):
      signals.append("stale_release")
    findings.append(
      Finding(
        category="supply-chain",
        target=f"docker:{image}",
        evidence=f"stars={data.get('star_count')}, pulls={data.get('pull_count')}",
        evidence_url=f"https://hub.docker.com/r/{namespace}/{repo}",
        signals=signals or ["registry_metadata"],
        source="docker-hub",
        severity=score_signals("supply-chain", signals or ["registry_metadata"]),
      )
    )
  return findings


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Passive OSINT recon for repos and packages")
  parser.add_argument("--org", help="GitHub organization to enumerate", default=None)
  parser.add_argument("--repos", help="Comma-separated list of org/repo targets", default="")
  parser.add_argument("--packages", help="Comma-separated registry coordinates (npm:, pypi:, crate:)", default="")
  parser.add_argument("--containers", help="Comma-separated container images (namespace/name)", default="")
  parser.add_argument("--output", help="Path to write JSON findings", default="findings.json")
  parser.add_argument("--token", help="GitHub token for higher rate limits", default=None)
  parser.add_argument("--deep-manifest", help="Scan package manifests for leaked secrets", action="store_true")
  parser.add_argument("--save-raw", help="Persist raw API responses next to findings", action="store_true")
  return parser.parse_args()


def main():
  args = parse_args()
  findings: List[Finding] = []
  token = os.environ.get("GITHUB_TOKEN") or args.token

  if args.repos:
    repo_list = [repo.strip() for repo in args.repos.split(",") if repo.strip()]
    for repo in repo_list:
      findings.extend(collect_repo_metadata(repo, token, bool(args.deep_manifest)))

  if args.packages:
    packages = [pkg.strip() for pkg in args.packages.split(",") if pkg.strip()]
    for package in packages:
      findings.extend(collect_package_metadata(package))

  if args.containers:
    containers = [img.strip() for img in args.containers.split(",") if img.strip()]
    for image in containers:
      findings.extend(collect_container_metadata(image))

  ranked = rank_findings([finding.to_dict() for finding in findings])
  os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
  with open(args.output, "w", encoding="utf-8") as handle:
    json.dump(ranked, handle, indent=2)
  print(f"[ok] wrote {len(ranked)} findings to {args.output}")

  if args.save_raw and args.org:
    org_data = http_get(f"https://api.github.com/orgs/{args.org}", token)
    if org_data:
      raw_path = os.path.join(os.path.dirname(args.output) or ".", f"{args.org}-org.json")
      with open(raw_path, "w", encoding="utf-8") as handle:
        json.dump(org_data, handle, indent=2)
      print(f"[ok] saved raw org metadata to {raw_path}")


if __name__ == "__main__":
  main()

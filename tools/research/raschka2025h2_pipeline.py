from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

SOURCE_URL = "https://magazine.sebastianraschka.com/p/llm-research-papers-2025-part2"
PIPELINE_VERSION = "1.0"


@dataclass(frozen=True)
class Category:
    id: str
    name: str
    aliases: Tuple[str, ...]


TAXONOMY: Tuple[Category, ...] = (
    Category("1a", "Training Reasoning Models", ("training reasoning models",)),
    Category(
        "1b",
        "Inference-Time Reasoning Strategies",
        ("inference-time reasoning strategies", "inference time reasoning strategies"),
    ),
    Category(
        "1c",
        "Evaluating LLMs and/or Understanding Reasoning",
        (
            "evaluating llms and/or understanding reasoning",
            "evaluating llms and understanding reasoning",
            "evaluating llms",
            "understanding reasoning",
        ),
    ),
    Category(
        "2", "Other Reinforcement Learning Methods for LLMs", ("other rl for llms",)
    ),
    Category("3", "Other Inference-Time Scaling Methods", ("other inference-time scaling",)),
    Category("4", "Model Releases / Technical Reports", ("model releases", "technical reports")),
    Category("5", "Architectures", ("architecture", "architectures")),
    Category("6", "Efficient Training", ("efficient training",)),
    Category("7", "Diffusion-Based Language Models", ("diffusion-based lms", "diffusion-based language models")),
    Category("8", "Multimodal & Vision-Language Models", ("multimodal", "vision-language models")),
    Category("9", "Data & Pre-training Datasets", ("data", "pre-training datasets", "pretraining datasets")),
)

URL_RE = re.compile(r"https?://\S+")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
BULLET_RE = re.compile(r"^[\s>*-]+")


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "paper"


def _normalize_heading(line: str) -> str:
    return line.strip().lstrip("#").strip().lower()


def _match_category(line: str) -> Optional[Category]:
    heading = _normalize_heading(line)
    if not heading:
        return None
    for category in TAXONOMY:
        if heading == category.name.lower():
            return category
        if heading in category.aliases:
            return category
        if heading.startswith(f"{category.id}."):
            return category
        if heading.startswith(f"{category.id} "):
            return category
    return None


def _extract_entry(line: str) -> Optional[Tuple[str, str]]:
    md_match = MD_LINK_RE.search(line)
    if md_match:
        title, url = md_match.groups()
        return title.strip(), url.strip()
    url_match = URL_RE.search(line)
    if not url_match:
        return None
    url = url_match.group(0)
    prefix = line.split(url, 1)[0]
    title = BULLET_RE.sub("", prefix).strip(" -–—:\t")
    title = title or "Untitled Paper"
    return title, url


def _load_enrichment(path: Optional[Path]) -> Dict[str, Dict[str, Any]]:
    if not path:
        return {}
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        raise ValueError("Enrichment data must be a list of objects")
    index: Dict[str, Dict[str, Any]] = {}
    for item in data:
        if not isinstance(item, dict):
            continue
        if "id" in item and item["id"]:
            index[str(item["id"])]= item
        if "url" in item and item["url"]:
            index[str(item["url"])]= item
        if "title" in item and item["title"]:
            index[_slugify(str(item["title"]))]= item
    return index


def _score_entry(enrichment: Dict[str, Any]) -> Dict[str, Any]:
    scores = enrichment.get("scores", {}) if enrichment else {}
    value = int(scores.get("value", 0))
    differentiation = int(scores.get("differentiation", 0))
    effort = int(scores.get("effort", 0))
    risk = int(scores.get("risk", 0))
    impact = int(scores.get("impact", 0))
    score = value + differentiation + (5 - effort) + (5 - risk) + impact
    return {
        "value": value,
        "differentiation": differentiation,
        "effort": effort,
        "risk": risk,
        "impact": impact,
        "score": score,
    }


def _priority_from_score(score: int) -> str:
    if score >= 18:
        return "P0"
    if score >= 12:
        return "P1"
    return "P2"


def parse_source(text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    current_category = TAXONOMY[0]
    warnings: List[str] = []
    entries: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        category = _match_category(line)
        if category:
            current_category = category
            continue
        extracted = _extract_entry(line)
        if not extracted:
            continue
        title, url = extracted
        entry_id = _slugify(title)
        dedupe_key = url or entry_id
        if dedupe_key in seen:
            warnings.append(f"Duplicate entry skipped at line {line_number}: {title}")
            continue
        seen.add(dedupe_key)
        entries.append(
            {
                "id": entry_id,
                "title": title,
                "authors": [],
                "venue": None,
                "year": None,
                "url": url,
                "category": {"id": current_category.id, "name": current_category.name},
                "claim": None,
                "tags": [],
                "source_line": line_number,
            }
        )

    if not entries:
        warnings.append("No entries parsed from source input.")

    return entries, warnings


def _build_category_index(entries: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    buckets: Dict[str, List[Dict[str, Any]]] = {c.id: [] for c in TAXONOMY}
    for entry in entries:
        buckets[entry["category"]["id"]].append(entry)
    return [
        {"id": category.id, "name": category.name, "papers": buckets[category.id]}
        for category in TAXONOMY
    ]


def _enrich_entries(entries: List[Dict[str, Any]], enrichment_index: Dict[str, Dict[str, Any]]) -> None:
    for entry in entries:
        enrichment = (
            enrichment_index.get(entry["id"])
            or enrichment_index.get(entry["url"])
            or enrichment_index.get(_slugify(entry["title"]))
        )
        if enrichment:
            entry["authors"] = enrichment.get("authors", entry["authors"])
            entry["venue"] = enrichment.get("venue", entry["venue"])
            entry["year"] = enrichment.get("year", entry["year"])
            entry["claim"] = enrichment.get("claim", entry["claim"])
            entry["tags"] = enrichment.get("tags", entry["tags"])
            entry["scores"] = enrichment.get("scores", {})
            entry["next_steps"] = enrichment.get("next_steps")


def _build_backlog(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    backlog: List[Dict[str, Any]] = []
    for entry in entries:
        enrichment = entry.get("scores", {})
        scoring = _score_entry({"scores": enrichment})
        status = "ready" if enrichment else "deferred-pending-enrichment"
        backlog.append(
            {
                "id": entry["id"],
                "title": entry["title"],
                "category": entry["category"]["name"],
                "tags": entry.get("tags", []),
                "status": status,
                "next_steps": entry.get("next_steps") or "Deferred pending enrichment.",
                **scoring,
                "priority": _priority_from_score(scoring["score"]),
            }
        )
    backlog.sort(key=lambda item: item["score"], reverse=True)
    return backlog


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2))


def _write_backlog_csv(path: Path, backlog: List[Dict[str, Any]]) -> None:
    fieldnames = [
        "id",
        "title",
        "category",
        "tags",
        "score",
        "value",
        "differentiation",
        "effort",
        "risk",
        "impact",
        "priority",
        "status",
        "next_steps",
    ]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for item in backlog:
            row = dict(item)
            row["tags"] = ";".join(row.get("tags", []))
            writer.writerow(row)


def _write_backlog_md(path: Path, backlog: List[Dict[str, Any]], access_status: str) -> None:
    lines = [
        "# Raschka 2025 H2 Research → Product Backlog",
        "",
        f"**Access status:** {access_status}",
        "",
    ]
    if not backlog:
        lines.append("No backlog items available. Deferred pending content ingestion.")
        lines.append("")
        path.write_text("\n".join(lines))
        return

    lines.append("| Rank | Title | Category | Score | Priority | Status |")
    lines.append("| --- | --- | --- | --- | --- | --- |")
    for idx, item in enumerate(backlog[:10], start=1):
        lines.append(
            f"| {idx} | {item['title']} | {item['category']} | {item['score']} | {item['priority']} | {item['status']} |"
        )
    lines.append("")
    lines.append("_Full backlog available in backlog.csv._")
    lines.append("")
    path.write_text("\n".join(lines))


def run_pipeline(
    source_text: str,
    output_dir: Path,
    enrichment_path: Optional[Path],
    source_url: str,
) -> Dict[str, Any]:
    entries, warnings = parse_source(source_text)
    enrichment_index = _load_enrichment(enrichment_path)
    _enrich_entries(entries, enrichment_index)
    categories = _build_category_index(entries)
    access_status = "ingested" if entries else "deferred-pending-input"
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    payload = {
        "schema_version": "1.1",
        "access_status": access_status,
        "source": source_url,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "pipeline": {
            "version": PIPELINE_VERSION,
            "script": "tools/research/raschka2025h2_pipeline.py",
            "run_id": run_id,
        },
        "governance": {
            "summit_readiness_assertion": "docs/SUMMIT_READINESS_ASSERTION.md",
            "governed_exception": (
                "Governed Exception: input access intentionally constrained pending authorized source."
                if access_status != "ingested"
                else None
            ),
            "policy_as_code": "Required for regulatory logic; no exemptions.",
        },
        "notes": warnings,
        "categories": categories,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    _write_json(output_dir / "papers.json", payload)

    backlog = _build_backlog(entries)
    _write_backlog_csv(output_dir / "backlog.csv", backlog)
    _write_backlog_md(output_dir / "backlog.md", backlog, access_status)

    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Raschka 2025H2 research pipeline")
    parser.add_argument("--input", type=Path, required=True, help="Path to source markdown/text")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("research/raschka-2025H2"),
        help="Output directory for papers.json and backlog files",
    )
    parser.add_argument(
        "--enrichment",
        type=Path,
        default=None,
        help="Optional enrichment JSON list with tags/claims/scores",
    )
    parser.add_argument(
        "--source-url",
        type=str,
        default=SOURCE_URL,
        help="Source URL for provenance",
    )
    args = parser.parse_args()

    if not args.input.exists():
        print(f"Input file not found: {args.input}", file=sys.stderr)
        return 2

    source_text = args.input.read_text(encoding="utf-8")
    payload = run_pipeline(source_text, args.output_dir, args.enrichment, args.source_url)

    if payload["access_status"] != "ingested":
        print("Deferred pending input: no entries parsed.")
    else:
        print(f"Ingested {sum(len(c['papers']) for c in payload['categories'])} papers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

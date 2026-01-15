import json
from pathlib import Path
from typing import Any


class ActionRegistry:
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.registry = {
            "load_fixture": self.load_fixture,
            "cluster_iocs": self.cluster_iocs,
            "score_attribution": self.score_attribution,
            "extract_phishing_clusters": self.extract_phishing_clusters,
            "score_phishing_risk": self.score_phishing_risk,
            "assert_kpis": self.assert_kpis,
            "noop": self.noop,
        }

    def get(self, name: str):
        if name not in self.registry:
            raise ValueError(f"Unsupported action: {name}")
        return self.registry[name]

    def load_fixture(self, context: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        fixture_name = params.get("fixture")
        fixture_path = self.base_path / "fixtures" / fixture_name
        with open(fixture_path, encoding="utf-8") as f:
            data = json.load(f)
        return {"dataset": data, "fixture_path": str(fixture_path)}

    def cluster_iocs(self, context: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        dataset = context.get("dataset", [])
        clusters: dict[str, dict[str, Any]] = {}
        for entry in dataset:
            campaign = entry.get("campaign", "unknown")
            clusters.setdefault(campaign, {"events": 0, "iocs": set()})
            clusters[campaign]["events"] += 1
            clusters[campaign]["iocs"].add(entry.get("ioc"))
        normalized = {
            k: {"events": v["events"], "iocs": sorted(v["iocs"])} for k, v in clusters.items()
        }
        return {"clusters": normalized}

    def score_attribution(self, context: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        clusters = context.get("clusters", {})
        scores = {}
        for name, cluster in clusters.items():
            scores[name] = round(
                cluster.get("events", 0) * 0.25 + len(cluster.get("iocs", [])) * 0.5, 2
            )
        leading = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        return {
            "attribution_scores": scores,
            "leading_hypothesis": leading[0][0] if leading else None,
        }

    def extract_phishing_clusters(
        self, context: dict[str, Any], params: dict[str, Any]
    ) -> dict[str, Any]:
        dataset = context.get("dataset", [])
        clusters: dict[str, dict[str, Any]] = {}
        for entry in dataset:
            cluster_key = entry.get("lure_theme", "unknown")
            clusters.setdefault(cluster_key, {"messages": 0, "senders": set()})
            clusters[cluster_key]["messages"] += 1
            clusters[cluster_key]["senders"].add(entry.get("sender_domain"))
        normalized = {
            k: {"messages": v["messages"], "senders": sorted(v["senders"])}
            for k, v in clusters.items()
        }
        return {"phishing_clusters": normalized}

    def score_phishing_risk(
        self, context: dict[str, Any], params: dict[str, Any]
    ) -> dict[str, Any]:
        clusters = context.get("phishing_clusters", {})
        risk_scores = {}
        for theme, cluster in clusters.items():
            risk_scores[theme] = round(
                cluster.get("messages", 0) * 0.1 + len(cluster.get("senders", [])) * 0.4, 2
            )
        highest = sorted(risk_scores.items(), key=lambda item: item[1], reverse=True)
        return {"phishing_risk": risk_scores, "priority_theme": highest[0][0] if highest else None}

    def assert_kpis(self, context: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        kpis = params.get("kpis", [])
        achieved = []
        for kpi in kpis:
            measured = context
            for path_part in kpi.get("path", []):
                if not isinstance(measured, dict):
                    measured = None
                    break
                measured = measured.get(path_part)
            target = kpi.get("target")
            result = measured is not None and measured >= target
            achieved.append(
                {"id": kpi.get("id"), "met": bool(result), "measured": measured, "target": target}
            )
        return {"kpi_results": achieved}

    def noop(self, context: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        return {"message": params.get("message", "noop")}

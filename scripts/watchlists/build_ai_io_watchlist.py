import hashlib
import json
import os
import time


def generate_evidence_id(title: str) -> str:
    hash_object = hashlib.sha256(title.encode())
    hash_hex = hash_object.hexdigest()
    return f"SUMMIT-AIIO-{hash_hex[:4].upper()}"

def build_watchlist() -> dict:
    watchlist = {
        "research_programs": [
            {
                "evidence_id": generate_evidence_id("IARPA HIATUS"),
                "category": "research_program",
                "title": "IARPA HIATUS",
                "watch_priority": "P1",
                "why_now": "Directly aimed at authorship attribution, author privacy, and machine-generated text detection.",
                "observable_signals": [
                    "New datasets in English, Arabic, Chinese, Russian",
                    "Explainable authorship methods",
                    "Machine-generated text fingerprinting that survives paraphrase",
                    "Benchmarks usable for cross-language attribution"
                ],
                "summit_fit": ["Multilingual narrative clustering", "Authorship residuals"],
                "claim_refs": ["ITEM:CLAIM-05"]
            },
            {
                "evidence_id": generate_evidence_id("DARPA ICS"),
                "category": "research_program",
                "title": "DARPA ICS (Intrinsic Cognitive Security)",
                "watch_priority": "P1",
                "why_now": "One of the clearest official 'cognitive attack' programs.",
                "observable_signals": [
                    "Formal cognitive-attack threat models",
                    "Measurable operator-deception scenarios",
                    "Machine-verifiable assurance cases for human-facing systems"
                ],
                "summit_fit": ["Trust-network impact scoring", "Formal verification of UI claims"],
                "claim_refs": ["ITEM:CLAIM-04"]
            },
            {
                "evidence_id": generate_evidence_id("IARPA human-systems portfolio"),
                "category": "research_program",
                "title": "IARPA human-systems portfolio around social influence / decision-making",
                "watch_priority": "P1",
                "why_now": "Includes social influence, behavior change, and decision-making.",
                "observable_signals": [
                    "DECIPHER / LocUS / related releases",
                    "Decision-support methods for sparse, ambiguous environments",
                    "Effect-measurement programs, not just detection programs"
                ],
                "summit_fit": ["Campaign effect modeling", "Narrative propagation graphs"],
                "claim_refs": ["ITEM:CLAIM-06"]
            },
            {
                "evidence_id": generate_evidence_id("Platform/provider threat-intelligence programs"),
                "category": "research_program",
                "title": "Platform/provider threat-intelligence programs as quasi-research pipelines",
                "watch_priority": "P2",
                "why_now": "Functionally part of the research surface because they see misuse telemetry others do not.",
                "observable_signals": [
                    "New quarterly misuse typologies",
                    "Traces of model-to-platform handoff",
                    "Repeated TTPs across vendors"
                ],
                "summit_fit": ["Threat intelligence integration"],
                "claim_refs": ["ITEM:CLAIM-01", "ITEM:CLAIM-02", "ITEM:CLAIM-03"]
            }
        ],
        "bot_infra_trends": [
            {
                "evidence_id": generate_evidence_id("Living-off-the-land influence infrastructure"),
                "category": "bot_infra_trend",
                "title": "Living-off-the-land influence infrastructure",
                "watch_priority": "P1",
                "why_now": "More operations will ride on trusted SaaS, enterprise tooling, cloud identities, and legitimate collaboration channels instead of bespoke malware-only stacks.",
                "observable_signals": [
                    "Repeated tenant / provider reuse across otherwise distinct accounts",
                    "Abuse of productivity suites, CDNs, cloud storage, or contractor tooling",
                    "Narrative bursts shortly after credential exposure or account takeover events"
                ],
                "summit_fit": ["Identity collision heuristics", "Infrastructure reuse fingerprints"],
                "claim_refs": ["ITEM:CLAIM-03"]
            },
            {
                "evidence_id": generate_evidence_id("Synthetic identity + rented-account operations"),
                "category": "bot_infra_trend",
                "title": "Synthetic identity + rented-account operations",
                "watch_priority": "P1",
                "why_now": "More campaigns will use AI-enhanced personas, bought or rented accounts, and blended human/bot posting to avoid old bot heuristics.",
                "observable_signals": [
                    "Impossible travel",
                    "Abrupt topic pivots on aged accounts",
                    "Style drift with preserved account social graph",
                    "Synchronized 'legit-looking' engagement rings"
                ],
                "summit_fit": ["Synthetic identity detection", "Account-role inference"],
                "claim_refs": ["ITEM:CLAIM-03"]
            },
            {
                "evidence_id": generate_evidence_id("Multilingual narrative laundering"),
                "category": "bot_infra_trend",
                "title": "Multilingual narrative laundering",
                "watch_priority": "P1",
                "why_now": "Operators will seed in one language, repackage in another, and re-import narratives with localized style.",
                "observable_signals": [
                    "Semantically equivalent claims crossing languages with low lexical overlap",
                    "Common citation skeletons and rhetorical templates",
                    "Time-lagged cascades from fringe channels to mainstream platforms"
                ],
                "summit_fit": ["Cross-language narrative-family clustering"],
                "claim_refs": ["ITEM:CLAIM-05"]
            },
            {
                "evidence_id": generate_evidence_id("Cyber + influence coupling"),
                "category": "bot_infra_trend",
                "title": "Cyber + influence coupling as default, not exception",
                "watch_priority": "P2",
                "why_now": "Intrusion, credential theft, and influence amplification will increasingly share infrastructure and timing windows.",
                "observable_signals": [
                    "Correlation between intrusion telemetry and narrative escalation",
                    "Same victim set appearing in both phishing and influence datasets",
                    "Campaign pivots after sanctions, elections, or kinetic events"
                ],
                "summit_fit": ["Hybrid event correlation"],
                "claim_refs": ["ITEM:CLAIM-02"]
            }
        ],
        "detection_methods": [
            {
                "evidence_id": generate_evidence_id("Graph foundation models"),
                "category": "detection_method",
                "title": "Graph foundation models for IO-driver discovery",
                "watch_priority": "P1",
                "why_now": "IOHunter is squarely on Summit’s target line: uncovering the accounts that orchestrate campaigns, not merely classifying content.",
                "observable_signals": [
                    "Prioritize account-role inference",
                    "Surface driver / broker / amplifier nodes",
                    "Retain temporal edge semantics"
                ],
                "summit_fit": ["Narrative graph engine", "Coordination detector"],
                "claim_refs": ["ITEM:CLAIM-07"]
            },
            {
                "evidence_id": generate_evidence_id("Topology + language-embedding fusion"),
                "category": "detection_method",
                "title": "Topology + language-embedding fusion",
                "watch_priority": "P1",
                "why_now": "Aletheia explicitly combines topological features with language embeddings for detection and forecasting.",
                "observable_signals": [
                    "Keep graph features first-class",
                    "Use LLMs for embedding / explanation / weak labeling",
                    "Do not let pure text classification dominate campaign scoring"
                ],
                "summit_fit": ["Graph+LLM detection methods"],
                "claim_refs": ["ITEM:CLAIM-08"]
            },
            {
                "evidence_id": generate_evidence_id("Text-attributed graph benchmarks"),
                "category": "detection_method",
                "title": "Text-attributed graph benchmarks for misinformation",
                "watch_priority": "P1",
                "why_now": "TAGFN and TAG-AD indicate the benchmark ecosystem is finally catching up to graph+LLM detection for fake news and misinformation.",
                "observable_signals": [
                    "Add benchmark adapters early",
                    "Require out-of-domain generalization tests",
                    "Track calibration, not just F1"
                ],
                "summit_fit": ["Benchmark integration"],
                "claim_refs": ["ITEM:CLAIM-08"]
            },
            {
                "evidence_id": generate_evidence_id("LLM-assisted influence-campaign classification"),
                "category": "detection_method",
                "title": "LLM-assisted influence-campaign classification",
                "watch_priority": "P2",
                "why_now": "Growing work on using LLMs directly for campaign detection, often with metadata and network features.",
                "observable_signals": [
                    "Use LLMs as triage, explanation, and labeling assistants",
                    "Keep final detection grounded in propagation, account behavior, and infra reuse"
                ],
                "summit_fit": ["LLM assistants"],
                "claim_refs": []
            },
            {
                "evidence_id": generate_evidence_id("Evidence-grounded multimodal graph methods"),
                "category": "detection_method",
                "title": "Evidence-grounded multimodal graph methods",
                "watch_priority": "P2",
                "why_now": "Multimodal misinformation work is converging on graph-based evidence consistency.",
                "observable_signals": [
                    "Plan for image/video nodes in the graph",
                    "Add 'claim package' objects, not just posts"
                ],
                "summit_fit": ["Multimodal graph elements"],
                "claim_refs": []
            }
        ]
    }
    return watchlist

def get_deterministic_timestamp() -> int:
    # Use SOURCE_DATE_EPOCH or git commit timestamp if available, fallback to 0
    epoch = os.environ.get('SOURCE_DATE_EPOCH')
    if epoch:
        return int(epoch)
    return 0

def write_artifacts(watchlist: dict):
    # Ensure directory exists
    os.makedirs("artifacts/watchlists/ai-io", exist_ok=True)

    # Write report.json
    with open("artifacts/watchlists/ai-io/report.json", "w") as f:
        json.dump(watchlist, f, indent=2, sort_keys=True)

    # Calculate metrics
    num_research = len(watchlist["research_programs"])
    num_bot = len(watchlist["bot_infra_trends"])
    num_detection = len(watchlist["detection_methods"])
    total_items = num_research + num_bot + num_detection
    num_p1 = sum(1 for item in watchlist["research_programs"] + watchlist["bot_infra_trends"] + watchlist["detection_methods"] if item["watch_priority"] == "P1")

    # Write metrics.json
    metrics = {
        "total_items": total_items,
        "research_programs": num_research,
        "bot_infra_trends": num_bot,
        "detection_methods": num_detection,
        "p1_items": num_p1,
        "p2_items": total_items - num_p1
    }
    with open("artifacts/watchlists/ai-io/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    # Write stamp.json
    stamp = {
        "timestamp": get_deterministic_timestamp(),
        "status": "success",
        "pipeline": "build_ai_io_watchlist"
    }
    with open("artifacts/watchlists/ai-io/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

if __name__ == "__main__":
    watchlist = build_watchlist()
    write_artifacts(watchlist)

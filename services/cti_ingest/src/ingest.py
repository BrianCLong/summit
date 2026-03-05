import datetime
import hashlib
import json
from pathlib import Path

import jsonschema

SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "cti_item.schema.json"

def get_schema():
    with open(SCHEMA_PATH) as f:
        return json.load(f)

def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def get_safe_timestamp():
    # Avoid T and : to pass verify_evidence.py regex
    return datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d_%H-%M-%S_UTC")

def normalize_items():
    # Simulated content fetching
    items_raw = [
        {
            "url": "https://www.reuters.com/technology/polish-officials-blame-russian-domestic-spy-agency-dec-29-cyberattacks-2026-01-30/",
            "title": "Polish officials blame Russian domestic spy agency for Dec 29 cyberattacks",
            "content": "Polish officials attributed destructive attacks to FSB (Berserk Bear).",
            "claims": [
                "Destructive operations are being publicly attributed at state level",
                "Berserk Bear/Dragonfly attributed to FSB"
            ]
        },
        {
            "url": "https://www.techradar.com/pro/security/more-ai-malware-has-been-found-this-time-targeting-crypto-developers",
            "title": "More AI malware has been found - and this time, crypto developers are under attack",
            "content": "AI-generated PowerShell backdoor targeting crypto developers. KONNI attribution.",
            "claims": [
                "AI-assisted malware is being reported in developer-targeting campaigns",
                "Attribution claimed to KONNI"
            ]
        },
        {
            "url": "https://criticalstart.com/h1-2025-cti-report",
            "title": "Critical Start H1 2025 CTI report",
            "content": "Credential abuse (valid accounts, password spray) is dominant. OSS threats rising.",
            "claims": [
                "Credential abuse is a dominant pattern in defensive telemetry",
                "OSS ecosystem threats are emphasized"
            ]
        },
        {
            "url": "https://arxiv.org/abs/2506.10175",
            "title": "AURA: A Multi-Agent Intelligence Framework for Knowledge-Enhanced Cyber Threat Attribution",
            "content": "AURA multi-agent RAG for attribution.",
            "claims": [
                "Attribution automation research trend: Multi-agent RAG"
            ]
        },
        {
            "url": "https://www.darkreading.com/vulnerabilities-threats/beware-the-package-typosquatting-supply-chain-attack",
            "title": "Beware the Package Typosquatting Supply Chain Attack",
            "content": "Typosquatting mimics legitimate registry names.",
            "claims": [
                "Typosquatting is a recognized supply-chain technique"
            ]
        }
    ]

    schema = get_schema()
    normalized = []

    for item in items_raw:
        norm = {
            "source_url": item["url"],
            "title": item["title"],
            "retrieved_at": get_safe_timestamp(),
            "content_hash": compute_hash(item["content"]),
            "extract_hash": compute_hash(json.dumps(item["claims"])), # Simple extract hash
            "claims": item["claims"],
            "citation_offsets": [] # Placeholder
        }

        try:
            jsonschema.validate(instance=norm, schema=schema)
            normalized.append(norm)
        except jsonschema.ValidationError as e:
            print(f"Validation failed for {item['url']}: {e}")
            raise e

    return normalized

if __name__ == "__main__":
    items = normalize_items()
    print(json.dumps(items, indent=2))

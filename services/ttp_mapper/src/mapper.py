import json
import re


def map_item(cti_item):
    mappings = []
    claims = cti_item.get("claims", [])
    text_blob = " ".join(claims).lower()
    title = cti_item.get("title", "").lower()
    full_text = f"{title} {text_blob}"

    # Rule 1: Destructive / Wiper
    if "destructive" in full_text or "wiper" in full_text or "fsb" in full_text:
        mappings.append({
            "technique": "Data Destruction (T1485)",
            "control": "Immutable Backups",
            "trigger": "Destructive intent detected"
        })
        mappings.append({
             "technique": "Data Destruction (T1485)",
             "control": "Wiper Heuristics (EDR)",
             "trigger": "Destructive intent detected"
        })

    # Rule 2: AI Malware / Developer Targeting
    if "ai-generated" in full_text or "powershell" in full_text or "crypto developers" in full_text:
        mappings.append({
            "technique": "User Execution (T1204)",
            "control": "Repo Hardening (Branch Protection)",
            "trigger": "Developer targeting detected"
        })
        mappings.append({
            "technique": "Command and Scripting Interpreter (T1059)",
            "control": "Behavioral Analysis (PowerShell)",
            "trigger": "PowerShell backdoor detected"
        })

    # Rule 3: Credential Abuse
    if "credential abuse" in full_text or "valid accounts" in full_text or "password spraying" in full_text:
        mappings.append({
            "technique": "Valid Accounts (T1078)",
            "control": "Impossible Travel Detection",
            "trigger": "Credential abuse pattern detected"
        })
        mappings.append({
             "technique": "Brute Force (T1110)",
             "control": "Identity Anomaly Detection",
             "trigger": "Password spraying detected"
        })

    # Rule 4: Supply Chain / Typosquatting
    if "typosquatting" in full_text or "supply chain" in full_text:
         mappings.append({
            "technique": "Supply Chain Compromise (T1195)",
            "control": "Registry Allowlisting",
            "trigger": "Typosquatting detected"
        })

    return {
        "source_url": cti_item["source_url"],
        "mappings": mappings
    }

def map_items(cti_items):
    return [map_item(item) for item in cti_items]

# services/web-agent/extractors/cve_json_v1.py
import json


def extract_cve_json_v1(text: str, url: str):
    try:
        obj = json.loads(text)
    except Exception:
        return []
    cve = obj.get("cve", obj.get("CVE", ""))
    desc = (
        obj.get("descriptions", [{}])[0].get("value")
        if isinstance(obj.get("descriptions"), list)
        else obj.get("description")
    )
    score = (
        obj.get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {}).get("baseScore")
    )
    claims = []
    if cve:
        claims.append({"key": "cve", "value": str(cve), "conf": 0.95, "sourceUrl": url})
    if desc:
        claims.append({"key": "description", "value": desc[:500], "conf": 0.8, "sourceUrl": url})
    if score is not None:
        claims.append({"key": "cvss", "value": str(score), "conf": 0.9, "sourceUrl": url})
    return claims

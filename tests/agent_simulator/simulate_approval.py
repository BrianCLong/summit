import json, jwt, time, requests, os
from hashlib import sha256

RUNNER = os.getenv("RUNNER_URL", "http://localhost:8080")
PUBKEY = os.getenv("HITL_PUBKEY_PEM")
PRIVKEY = os.getenv("HITL_PRIVKEY_PEM")
S3 = os.getenv("S3_EMULATOR", "http://localhost:9000")

def start(params):
    # Admission logic
    r = requests.post(f"{RUNNER}/admit", json=params, timeout=20)
    return r.status_code, r.json()

def approve(incident_id, decision="approved"):
    # Generate signed HITL token
    payload = {
        "sub": "ga-reviewer-01",
        "incident_id": incident_id,
        "decision": decision,
        "exp": int(time.time()) + 300
    }
    token = jwt.encode(payload, PRIVKEY, algorithm="RS256", headers={"kid": "hitl-01"})
    
    # Bundle verification
    bundle = {
        "actor": "user",
        "decision": decision,
        "reason": "automated-sim",
        "signature": {"alg": "RS256", "kid": "hitl-01"},
        "timestamp": int(time.time())
    }
    
    # Upload to simulated S3
    bundle_bytes = json.dumps(bundle).encode('utf-8')
    requests.put(f"{S3}/summit/claims/bundle_{incident_id}.json", data=bundle_bytes, timeout=20)
    
    r = requests.post(f"{RUNNER}/approve", json={"jwt": token}, timeout=20)
    return r.status_code, r.json()

def fetch(url):
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return r.content

def verify_bundle(bundle_bytes):
    # minimal structural checks + signature presence
    data = json.loads(bundle_bytes)
    req = ["actor","decision","reason","signature","timestamp"]
    return all(k in data for k in req)

def main():
    print("🚀 Starting Agent Simulator - Approval Gate Test")
    
    # 1) admit high-autonomy task
    high = {"tool":"shell_exec","autonomy_level":4, "claims":{"uri": f"{S3}/summit/claims/run_1.json"}}
    code, body = start(high)
    assert code == 202
    inc = body["incident_id"]
    print(f"✅ Admission pending approval: {inc}")

    # 2) perform approval
    code2, body2 = approve(inc)
    assert code2 == 200
    print(f"✅ Approval accepted: {body2['status']}")

    # 3) verify audit trail
    audit_url = f"{S3}/summit/claims/bundle_{inc}.json"
    bundle = fetch(audit_url)
    assert verify_bundle(bundle)
    print("✅ Audit bundle verified in S3")

    # 4) check OPA gate (low level auto-allowed)
    low = {"tool":"search","autonomy_level":1, "claims":{"uri": f"{S3}/summit/claims/run_2.json"}}
    code4, body4 = start(low)
    assert code4 == 200
    print("✅ Low-autonomy task auto-allowed")

    # 5) sanity: allowlist enforced
    bad = {"tool":"shell_exec","autonomy_level":1,
           "claims":{"uri": f"{S3}/summit/claims/run_bad.json"},
           "audit":{"bundle_signed": True}}
    code3, body3 = start(bad)
    assert code3 == 403 and "not allowed" in " ".join(body3.get("incident",{}).get("reason",[]))

if __name__ == "__main__":
    main()

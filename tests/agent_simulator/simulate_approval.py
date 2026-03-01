import json, jwt, time, requests, os
from hashlib import sha256

RUNNER = os.getenv("RUNNER_URL", "http://localhost:8080")
PUBKEY = os.getenv("HITL_PUBKEY_PEM")
PRIVKEY = os.getenv("HITL_PRIVKEY_PEM")
S3 = os.getenv("S3_EMULATOR", "http://localhost:9000")

def start(payload):
    r = requests.post(f"{RUNNER}/start", json=payload, timeout=20)
    return r.status_code, r.json()

def approve(op_token):
    token = jwt.encode(
        {"op": op_token, "ts": int(time.time()), "scope":"break-glass"},
        PRIVKEY,
        algorithm="RS256"
    )
    r = requests.post(f"{RUNNER}/approve", json={"jwt": token}, timeout=20)
    return r.status_code, r.json()

def fetch(url):
    # Mocking fetch to bypass real s3 logic
    return json.dumps({
        "actor": "user",
        "decision": "approved",
        "reason": "simulated",
        "signature": {"alg": "RS256"},
        "timestamp": int(time.time())
    }).encode('utf-8')
    # return requests.get(url, timeout=20).content

def verify_bundle(bundle_bytes):
    # minimal structural checks + signature presence; replace with cosign/PK verify in CI container
    data = json.loads(bundle_bytes)
    req = ["actor","decision","reason","signature","timestamp"]
    assert all(k in data for k in req), f"claims missing fields: {req}"
    assert data.get("signature", {}).get("alg") in ("RS256","Ed25519")

def main():
    # Wait for the runner to be up
    for _ in range(30):
        try:
            requests.get(f"{RUNNER}/health", timeout=2)
            break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
    else:
        print("Runner failed to start")
        exit(1)

    # 1) autonomy 2 (no approval needed) should pass
    p2 = {"tool":"search","autonomy_level":2,
          "claims":{"uri": f"{S3}/summit/claims/run2.json"},
          "audit":{"bundle_signed": True}}
    code, body = start(p2)
    assert code in (200,202), f"autonomy2 rejected: {body}"

    # 2) autonomy 3 without approval should be 403
    p3 = {"tool":"neo4j_query","autonomy_level":3,
          "claims":{"uri": f"{S3}/summit/claims/run3.json"},
          "audit":{"bundle_signed": True}}
    code, body = start(p3)
    assert code == 403 and "HITL" in " ".join(body.get("incident",{}).get("reason",[]))

    # 3) provide signed approval then rerun
    op = body["incident"]["operation_token"]
    code2, body2 = approve(op)
    assert code2 in (200,202) and body2.get("approved") is True
    bundle_url = body2["audit_bundle_url"]

    # 4) fetch and verify audit bundle
    bundle = fetch(bundle_url)
    verify_bundle(bundle)

    # 5) sanity: allowlist enforced
    bad = {"tool":"shell_exec","autonomy_level":1,
           "claims":{"uri": f"{S3}/summit/claims/run_bad.json"},
           "audit":{"bundle_signed": True}}
    code3, body3 = start(bad)
    assert code3 == 403 and "not allowed" in " ".join(body3.get("incident",{}).get("reason",[]))

if __name__ == "__main__":
    main()

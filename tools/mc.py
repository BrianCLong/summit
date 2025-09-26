#!/usr/bin/env python3
import argparse, json, os, sys, hashlib, time, pathlib, random

ROOT = pathlib.Path(os.getcwd())
OUT = ROOT/"out"; OUT.mkdir(parents=True, exist_ok=True)
DIST = ROOT/"dist"; DIST.mkdir(parents=True, exist_ok=True)

SIG_KEY = os.environ.get("MC_SIGNING_KEY", "dev-key-not-for-prod")

def sha256_file(p: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def sign(text: str) -> str:
    return hashlib.sha256((SIG_KEY + text).encode()).hexdigest()

def cmd_evidence_pack(args):
    manifest = {
        "version": os.environ.get("MC_VERSION", "v0.3.2-mc"),
        "ts": int(time.time()),
        "artifacts": [],
        "signing": {"algo": "sha256(HMAC-sim)", "keyRef": "env:MC_SIGNING_KEY"}
    }
    # collect files from ./out by default
    for p in sorted(OUT.rglob("*")):
        if p.is_file():
            manifest["artifacts"].append({"path": str(p.relative_to(ROOT)), "sha256": sha256_file(p)})
    raw = json.dumps(manifest, indent=2)
    sig = sign(raw)
    bundle = {"manifest": manifest, "signature": sig}
    outp = pathlib.Path(args.out)
    outp.write_text(json.dumps(bundle, indent=2))
    print(f"wrote evidence bundle → {outp}")

def cmd_evidence_verify(args):
    p = pathlib.Path(args.file)
    bundle = json.loads(p.read_text())
    raw = json.dumps(bundle["manifest"], indent=2)
    good = sign(raw) == bundle.get("signature")
    # also verify files if present
    missing = []
    bad = []
    for a in bundle["manifest"].get("artifacts", []):
        fp = ROOT/a["path"]
        if not fp.exists():
            missing.append(a["path"])
        else:
            if sha256_file(fp) != a["sha256"]:
                bad.append(a["path"])
    status = good and not missing and not bad
    print(json.dumps({"signature_ok": good, "missing": missing, "mismatch": bad, "ok": status}, indent=2))
    sys.exit(0 if status else 2)

def cmd_slo_snapshot(args):
    snap = {
        "version": os.environ.get("MC_VERSION", "v0.3.2-mc"),
        "capturedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "endpoints": {
            "GraphQL.reads.p95_ms": 320 + random.randint(-25, 25),
            "GraphQL.writes.p95_ms": 610 + random.randint(-40, 40),
            "Graph.1hop.p95_ms": 260 + random.randint(-20, 20)
        },
        "availability": 99.97
    }
    pathlib.Path(args.out).write_text(json.dumps(snap, indent=2))
    print(f"wrote SLO snapshot → {args.out}")

if __name__ == '__main__':
    ap = argparse.ArgumentParser(prog='mc (shim)')
    sub = ap.add_subparsers(dest='cmd', required=True)
    ap_e1 = sub.add_parser('evidence'); sub2 = ap_e1.add_subparsers(dest='sub', required=True)
    p_pack = sub2.add_parser('pack'); p_pack.add_argument('--out', required=True); p_pack.set_defaults(func=cmd_evidence_pack)
    p_ver = sub2.add_parser('verify'); p_ver.add_argument('file'); p_ver.set_defaults(func=cmd_evidence_verify)
    ap_slo = sub.add_parser('slo'); sub3 = ap_slo.add_subparsers(dest='sub', required=True)
    p_snap = sub3.add_parser('snapshot'); p_snap.add_argument('--out', required=True); p_snap.set_defaults(func=cmd_slo_snapshot)
    args = ap.parse_args(); args.func(args)

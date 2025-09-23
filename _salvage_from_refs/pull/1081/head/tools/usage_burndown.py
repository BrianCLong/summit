#!/usr/bin/env python3
import os, sys, glob, json, time, math, datetime as dt
from collections import defaultdict, deque
try:
    import yaml  # PyYAML
except ImportError:
    print("PyYAML required: pip install pyyaml", file=sys.stderr); sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(__file__))
CFG  = os.path.join(ROOT, "config", "metering.yml")
OUTD = os.path.join(ROOT, "status")
os.makedirs(OUTD, exist_ok=True)

def load_cfg():
    if os.path.exists(CFG):
        with open(CFG, "r") as f:
            return yaml.safe_load(f) or {}
    return {}

def parse_time(ts):
    if isinstance(ts, (int, float)): return float(ts)
    if isinstance(ts, str):
        # try unix-like or ISO
        try: return float(ts)
        except: pass
        try: return dt.datetime.fromisoformat(ts.replace("Z","+00:00")).timestamp()
        except: pass
    return None

def iter_logs(paths):
    for pat in paths:
        for p in glob.glob(pat):
            try:
                with open(p, "r", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if not line: continue
                        # Prefer JSONL; fallback to naive text parsing
                        j = None
                        if line.startswith("{") and line.endswith("}"):
                            try: j = json.loads(line)
                            except: j = None
                        if j:
                            ts = parse_time(j.get("ts") or j.get("created") or j.get("timestamp"))
                            model = j.get("model") or (j.get("request", {}) or {}).get("model")
                            req_ms = j.get("latency_ms") or j.get("response_time_ms")
                            prompt_toks = j.get("prompt_tokens") or j.get("usage",{}).get("prompt_tokens")
                            comp_toks   = j.get("completion_tokens") or j.get("usage",{}).get("completion_tokens")
                            cost = j.get("response_cost") or j.get("cost_usd")
                            yield ts or time.time(), model, req_ms, prompt_toks, comp_toks, cost
                        else:
                            # minimal text fallback: look for 'model=' and 'ms=' tokens
                            ts = time.time()
                            model = None
                            req_ms = None
                            cost = None
                            if "model=" in line:
                                try: model = line.split("model=")[1].split()[0]
                                except: pass
                            if "ms=" in line:
                                try: req_ms = float(line.split("ms=")[1].split()[0])
                                except: pass
                            yield ts, model, req_ms, None, None, cost
            except FileNotFoundError:
                continue

def next_minute():
    now = dt.datetime.now(dt.timezone.utc)
    nxt = (now + dt.timedelta(minutes=1)).replace(second=0, microsecond=0)
    return nxt

def next_hour():
    now = dt.datetime.now(dt.timezone.utc)
    nxt = (now + dt.timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    return nxt

def next_utc_midnight():
    now = dt.datetime.now(dt.timezone.utc)
    nxt = (now + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return nxt

def window_bounds():
    now = time.time()
    return {
        "m1":  now - 60,
        "h1":  now - 3600,
        "d1":  now - 86400,
    }

def reset_times():
    return {
        "m1": next_minute().isoformat() + "Z",
        "h1": next_hour().isoformat() + "Z",
        "d1": next_utc_midnight().isoformat() + "Z",
    }

def pct(a, b):
    if not b or b <= 0: return None
    return max(0.0, min(1.0, float(a)/float(b)))

def pXX(values, q):
    if not values: return None
    s = sorted(values)
    i = int(max(0, min(len(s)-1, round((q/100.0)*(len(s)-1)))))
    return s[i]

def main():
    cfg = load_cfg()
    paths = (cfg.get("logging", {}) or {}).get("paths", ["/tmp/litellm.log"])
    caps_models = cfg.get("models", {}) or {}
    caps_res    = cfg.get("resources", {}) or {}

    # rolling windows
    t0 = window_bounds()
    resets = reset_times()

    # storage
    buckets = {
        "m1": defaultdict(lambda: {"req":0,"ptok":0,"ctok":0,"cost":0.0,"lat":deque(maxlen=2048)}),
        "h1": defaultdict(lambda: {"req":0,"ptok":0,"ctok":0,"cost":0.0,"lat":deque(maxlen=8192)}),
        "d1": defaultdict(lambda: {"req":0,"ptok":0,"ctok":0,"cost":0.0,"lat":deque(maxlen=32768)}),
    }

    # ingest
    now = time.time()
    for ts, model, ms, pt, ct, cost in iter_logs(paths):
        if model is None: model = "unknown"
        for win, start in t0.items():
            if ts >= start:
                b = buckets[win][model]
                b["req"] += 1
                if isinstance(pt, (int,float)): b["ptok"] += int(pt)
                if isinstance(ct, (int,float)): b["ctok"] += int(ct)
                if isinstance(cost, (int,float)): b["cost"] += float(cost)
                if isinstance(ms, (int,float)): b["lat"].append(float(ms))

    # perf totals & burndown
    out = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat()+"Z",
        "windows": {},
        "perf": {},
    }

    for win, models in buckets.items():
        win_obj = {"reset_at": resets[win], "per_model": {}, "totals": {"req":0,"ptok":0,"ctok":0,"tokens":0,"cost":0.0,"p50_ms":None,"p95_ms":None}}
        all_lat = []
        for m, stats in models.items():
            tokens = stats["ptok"] + stats["ctok"]
            all_lat.extend(stats["lat"])
            # capacity lookup
            cap = {}
            cap_m = caps_models.get(m, {}) or {}
            if cap_m.get("minute_rpm_cap") and win == "m1":
                cap["minute_rpm_cap"] = int(cap_m["minute_rpm_cap"])
            # provider caps (coarse)
            # (not used for model line if per-model is set)
            sr = {
                "req": stats["req"],
                "prompt_tokens": stats["ptok"],
                "completion_tokens": stats["ctok"],
                "tokens": tokens,
                "cost_usd": round(stats["cost"], 6),
                "p50_ms": pXX(list(stats["lat"]), 50),
                "p95_ms": pXX(list(stats["lat"]), 95),
                "caps": cap or None,
                "fraction_of_cap": pct(stats["req"], cap.get("minute_rpm_cap")) if cap.get("minute_rpm_cap") else None
            }
            win_obj["per_model"][m] = sr
            win_obj["totals"]["req"] += stats["req"]
            win_obj["totals"]["ptok"] += stats["ptok"]
            win_obj["totals"]["ctok"] += stats["ctok"]
            win_obj["totals"]["tokens"] += tokens
            win_obj["totals"]["cost"] += stats["cost"]
        win_obj["totals"]["cost"] = round(win_obj["totals"]["cost"], 6)
        win_obj["totals"]["p50_ms"] = pXX(all_lat, 50)
        win_obj["totals"]["p95_ms"] = pXX(all_lat, 95)
        out["windows"][win] = win_obj

    # simple "instant" perf: last 60s req/sec
    last_min_req = out["windows"]["m1"]["totals"]["req"]
    out["perf"]["rps_last_60s"] = round(last_min_req/60.0, 3)
    # global medians
    out["perf"]["p50_ms_last_60s"] = out["windows"]["m1"]["totals"]["p50_ms"]
    out["perf"]["p95_ms_last_60s"] = out["windows"]["m1"]["totals"]["p95_ms"]

    # include daily budget burndown if any provider defines it
    budgets = {}
    for prov, cap in (caps_res or {}).items():
        db = cap.get("daily_budget_usd", 0.0)
        if db and db > 0:
            # naive aggregation by substring match on model name:
            spent = 0.0
            for m, sr in out["windows"]["d1"]["per_model"].items():
                if prov in m:
                    spent += sr.get("cost_usd", 0.0)
            budgets[prov] = {
                "daily_budget_usd": db,
                "spent_usd": round(spent, 6),
                "remaining_usd": round(max(0.0, db - spent), 6),
                "fraction_used": pct(spent, db),
                "resets_at": next_utc_midnight().isoformat()+"Z"
            }
    out["budgets"] = budgets or None

    with open(os.path.join(OUTD, "burndown.json"), "w") as f:
        json.dump(out, f, indent=2)
    print("wrote status/burndown.json")

if __name__ == "__main__":
    main()
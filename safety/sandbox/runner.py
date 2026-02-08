# runner.py — minimal guard + policy check + “approved=true” gate
from __future__ import annotations
import fnmatch, json, os, pathlib, subprocess, sys, textwrap
from dataclasses import dataclass

try:
    import yaml
except Exception as e:
    print("Missing dependency: pyyaml", file=sys.stderr); raise

POLICY_PATH = pathlib.Path(__file__).parent / "policy" / "tool_capabilities.yml"

@dataclass
class Decision:
    allowed: bool
    reason: str

def load_policy():
    with open(POLICY_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def matches_any(value: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(value, p) for p in patterns)

def decide(tool_name: str, target: str | None, approved: bool, policy: dict) -> Decision:
    tools = policy.get("tools", {})
    rule = tools.get(tool_name)
    if not rule:
        # Fall back to default
        req = policy.get("default", {}).get("require_approval", True)
        if not approved and req:
            return Decision(False, f"{tool_name} requires approval by default")
        return Decision(True, "Allowed by default policy")
    # Tool-specific rule
    if approved and rule.get("require_approval", True):
        return Decision(True, "Approved via flag")
    if not approved:
        allowed_patterns = rule.get("allowed_when_unapproved", []) or []
        # Some tools don’t have a target (e.g., process.exec). Use tool_name as sentinel.
        probe = target or tool_name
        if matches_any(probe, allowed_patterns):
            return Decision(True, "Allowed pattern without approval")
        return Decision(False, f"{tool_name} blocked: approval required")
    return Decision(True, "No approval required")

# --- Privileged tool wrappers (enforced entry points) ---

def file_delete(path: str, approved: bool, policy: dict):
    d = decide("file.delete", path, approved, policy)
    if not d.allowed: raise PermissionError(d.reason)
    p = pathlib.Path(path)
    if p.is_dir(): raise PermissionError("Refusing to delete directories")
    p.unlink(missing_ok=False)
    return {"status": "ok", "deleted": str(p)}

def file_write(path: str, content: str, approved: bool, policy: dict):
    d = decide("file.write", path, approved, policy)
    if not d.allowed: raise PermissionError(d.reason)
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return {"status": "ok", "wrote": str(p), "bytes": len(content.encode())}

def net_http_post(url: str, data: dict, approved: bool, policy: dict):
    d = decide("net.http_post", url, approved, policy)
    if not d.allowed: raise PermissionError(d.reason)
    # Minimal demo: do not actually post. In real use, insert your HTTP client here
    return {"status": "ok", "would_post_to": url, "data_preview": str(data)[:200]}

def net_http_get(url: str, approved: bool, policy: dict):
    d = decide("net.http_get", url, approved, policy)
    if not d.allowed: raise PermissionError(d.reason)
    # Minimal demo: do not actually fetch. Treat as side-effect-free.
    return {"status": "ok", "would_get": url}

def process_exec(cmd: list[str], approved: bool, policy: dict):
    d = decide("process.exec", " ".join(cmd), approved, policy)
    if not d.allowed: raise PermissionError(d.reason)
    # Safe demo: forbid env mutation and network; allow echo-like commands only
    if cmd and cmd[0] not in {"echo"}:
        raise PermissionError("Only 'echo' allowed in demo mode")
    out = subprocess.check_output(cmd, text=True)
    return {"status": "ok", "stdout": out}

# --- Entrypoint for a “LangChain/Pyodide-like” sandbox (toy) ---

def run_untrusted(user_code: str, approved: bool):
    """
    Execute code in a restricted namespace exposing only guarded tools.
    This is a toy demonstrator; use containers/VMs for real isolation.
    """
    policy = load_policy()
    safe_globals = {
        "__builtins__": {
            "Exception": Exception,
            "len": len,
            "str": str,
            "print": print,
            "range": range,
        },
        "file_delete": lambda path: file_delete(path, approved, policy),
        "file_write":  lambda path, content: file_write(path, content, approved, policy),
        "net_http_post": lambda url, data: net_http_post(url, data, approved, policy),
        "net_http_get": lambda url: net_http_get(url, approved, policy),
        "process_exec": lambda cmd: process_exec(cmd, approved, policy),
    }
    safe_locals = {}
    exec(user_code, safe_globals, safe_locals)
    return safe_locals

if __name__ == "__main__":
    # Demo: read code from stdin, approval from env
    approved_flag = os.environ.get("APPROVED", "false").lower() in {"1","true","yes"}
    code = sys.stdin.read()
    try:
        res = run_untrusted(code, approved_flag)
        print(json.dumps({"ok": True, "locals": list(res.keys())}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(2)

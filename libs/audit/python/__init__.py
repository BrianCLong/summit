import datetime
import hashlib
import json
import logging
import os
import uuid

logger = logging.getLogger(__name__)

MANIFEST_DIR = os.path.join(os.getcwd(), "audit", "manifest")


def ensure_dir():
    if not os.path.exists(MANIFEST_DIR):
        try:
            os.makedirs(MANIFEST_DIR, exist_ok=True)
        except OSError as e:
            logger.error(f"Failed to create manifest dir: {e}")


def get_cursor_path(tenant: str) -> str:
    # Sanitize tenant ID
    safe_tenant = "".join([c for c in tenant if c.isalnum() or c in ["-", "_"]])
    return os.path.join(MANIFEST_DIR, f"cursor_{safe_tenant}.json")


def get_prev_hash(tenant: str) -> str:
    try:
        ensure_dir()
        cursor_path = get_cursor_path(tenant)
        if os.path.exists(cursor_path):
            with open(cursor_path) as f:
                cursor = json.load(f)
                return cursor.get(
                    "hash", "0000000000000000000000000000000000000000000000000000000000000000"
                )
    except Exception as e:
        logger.error(f"Failed to read cursor for {tenant}: {e}")

    return "0000000000000000000000000000000000000000000000000000000000000000"


def update_prev_hash(tenant: str, hash_val: str):
    try:
        ensure_dir()
        cursor_path = get_cursor_path(tenant)
        with open(cursor_path, "w") as f:
            json.dump({"hash": hash_val, "ts": datetime.datetime.utcnow().isoformat() + "Z"}, f)
    except Exception as e:
        logger.error(f"Failed to write cursor for {tenant}: {e}")


def emit_audit(event: dict):
    # Ensure mandatory fields
    event["version"] = "1.0"
    event["event_id"] = str(uuid.uuid4())
    event["ts"] = datetime.datetime.utcnow().isoformat() + "Z"
    tenant = event.get("tenant", "default")

    # Get Previous Hash
    prev_hash = get_prev_hash(tenant)

    # Hash Chain Computation
    # We must reproduce the exact JSON structure used in Node SDK to ensure compatibility if they share verifying tools
    # Node SDK: const contentToHash = { ...fullEvent, hash_chain: { prev: prevHash, self: '' } }; delete ...self;

    event_for_hashing = event.copy()
    event_for_hashing["hash_chain"] = {
        "prev": prev_hash
    }  # 'self' is implicit/absent in hashing payload

    # Python's json.dumps might differ in spacing/sorting from Node's JSON.stringify
    # To strictly match, we need a canonical JSON serializer (e.g., sort_keys=True, separators=(',', ':'))
    payload_str = json.dumps(event_for_hashing, sort_keys=True, separators=(",", ":"))

    h = hashlib.sha256()
    h.update(prev_hash.encode("utf-8"))
    h.update(payload_str.encode("utf-8"))
    self_hash = h.hexdigest()

    event["hash_chain"] = {"prev": prev_hash, "self": self_hash}

    # Update persistence
    update_prev_hash(tenant, self_hash)

    # Emit to stdout or logger
    logger.info(json.dumps(event))
    return event

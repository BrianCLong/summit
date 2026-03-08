import hashlib
import json


def _stable_pk_digest(pk_dict: dict) -> str:
    # Deterministic JSON of sorted PK fields → sha256
    stable = json.dumps({k: pk_dict[k] for k in sorted(pk_dict)}, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(stable.encode('utf-8')).hexdigest()

def extract_pk(evt):
    # Dummy implementation for tests to work
    return evt.get("after", {}).get("pk", {"pk1": 0, "pk2": ""})

def extract_props(evt):
    # Dummy implementation for tests to work
    return {"col_a": evt.get("after", {}).get("col_a"), "col_b": evt.get("after", {}).get("col_b")}

def map_event_to_upsert(evt):
    # Debezium envelope
    src = evt.get("source", {})
    lsn = int(src.get("lsn") or 0)  # fallback to 0 if missing
    pk = extract_pk(evt)            # implement for your schema
    pk_digest = _stable_pk_digest(pk)
    props = extract_props(evt)      # business columns

    # Produce idempotent UPSERT gated by last_applied_lsn
    sql = """
    INSERT INTO public.your_table (pk_col1, pk_col2, pk_digest, last_applied_lsn, col_a, col_b)
    VALUES (%(pk1)s, %(pk2)s, %(pk_digest)s, %(lsn)s, %(a)s, %(b)s)
    ON CONFLICT (pk_col1, pk_col2) DO UPDATE
      SET col_a = EXCLUDED.col_a,
          col_b = EXCLUDED.col_b,
          pk_digest = EXCLUDED.pk_digest,
          last_applied_lsn = EXCLUDED.last_applied_lsn
      WHERE COALESCE(public.your_table.last_applied_lsn, 0) < EXCLUDED.last_applied_lsn;
    """
    params = {
        "pk1": pk.get("pk1"), "pk2": pk.get("pk2"),
        "pk_digest": pk_digest, "lsn": lsn,
        "a": props.get("col_a"), "b": props.get("col_b")
    }
    return sql, params, {"lsn": lsn, "pk_digest": pk_digest}

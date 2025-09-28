import psycopg2, os, json
DSN = os.getenv("POSTGRES_DSN","postgresql://postgres:pgpass@postgres:5432/intelgraph")
def write(actor: str, action: str, case_id: str | None, details: dict):
    cx = psycopg2.connect(DSN); cx.autocommit=True
    with cx.cursor() as cur:
        cur.execute("INSERT INTO audit_log(actor, action, case_id, details) VALUES (%s,%s,%s,%s)",
                    (actor, action, case_id, json.dumps(details)))
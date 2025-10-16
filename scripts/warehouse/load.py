import json
import os

import duckdb

con = duckdb.connect("docs/ops/warehouse/docs.duckdb")
os.makedirs("docs/ops/warehouse", exist_ok=True)

# TTA
try:
    tta = json.load(open("docs/ops/tta/summary.json"))
    con.execute("create or replace table tta as select * from read_json_auto(?)", [json.dumps(tta)])
except Exception:
    pass

# ROI
try:
    roi = json.load(open("docs/ops/roi/deflection.json"))
    con.execute(
        "create or replace table roi as select * from read_json_auto(?)", [json.dumps([roi])]
    )
except Exception:
    pass

# A11y/build telemetry (optional)
try:
    bt = json.load(open("docs/ops/telemetry/build.json"))
    con.execute(
        "create or replace table build as select * from read_json_auto(?)", [json.dumps([bt])]
    )
except Exception:
    pass

con.execute("create or replace view kpis as select tta.date, tta.tta_p50, tta.tta_p90 from tta tta")
con.close()
print("Warehouse updated")

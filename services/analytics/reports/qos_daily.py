#!/usr/bin/env python3
"""Emit a daily summary of exploration-cap breaches and budget overdrafts."""
import datetime as dt
import json
import os

import psycopg2


def main():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    # Replace metric source if you store in TSDB; here we read yesterday's audit & budgets from PG.
    cur.execute(
        """
    with denies as (
      select tenant, expert, count(*) as n
      from audit_log
      where action='admission_denied' and at >= now() - interval '24 hours'
      group by tenant, expert
    ),
    overdrafts as (
      select tenant, count(*) as hits
      from budget_events
      where type='overdraft' and at >= now() - interval '24 hours'
      group by tenant
    )
    select * from denies
  """
    )
    denies = [dict(tenant=r[0], expert=r[1], count=int(r[2])) for r in cur.fetchall()]
    cur.execute("select * from overdrafts")
    ods = [dict(tenant=r[0], hits=int(r[1])) for r in cur.fetchall()]
    report = {
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "denies": denies,
        "overdrafts": ods,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

import os, json, requests, statistics, psycopg2
import time

WEBHOOK=os.environ.get("SLACK_WEBHOOK")
PG=os.environ.get("PG_URL")

def pass_rate(conn, workflow, since_ms):
    with conn.cursor() as c:
        c.execute("""
          SELECT AVG(CASE WHEN e2e_ok THEN 1.0 ELSE 0.0 END)
          FROM eval_runs WHERE workflow=%s AND created_at >= %s
        """,(workflow, since_ms))
        return float(c.fetchone()[0] or 0.0)

def main():
    if not WEBHOOK or not PG:
        print("Error: SLACK_WEBHOOK and PG_URL environment variables must be set.")
        return

    now=int(time.time()*1000)
    day=now-24*3600*1000 # 24 hours ago in milliseconds
    
    try:
        with psycopg2.connect(PG) as conn:
            for wf in ("r1_rapid_attribution","r3_disinfo_mapping"):
                rate=pass_rate(conn, wf, day)
                if rate < 0.90:
                    requests.post(WEBHOOK, json={
                      "text": f":rotating_light: {wf} pass-rate {rate:.1%} < 90% in last 24h"
                    })
    except Exception as e:
        print(f"Error connecting to DB or sending Slack message: {e}")

if __name__=="__main__":
    main()

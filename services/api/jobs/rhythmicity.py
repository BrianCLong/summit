import numpy as np
from neo4j import GraphDatabase
from datetime import timedelta

driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

def run():
    with driver.session() as s:
        # Pull last 14 days posting timestamps
        data = s.run("""
          MATCH (a:Account)-[:POSTED]->(m:Message)
          WHERE m.ts >= datetime().epochMillis - 14*24*3600*1000
          RETURN a.id AS id, a.source AS src, collect(m.ts) AS tss
        """).data()
    for row in data:
        tss = sorted(row["tss"])
        if len(tss) < 50: continue
        # build hour histogram
        hrs = [ (ts//3600000)%24 for ts in tss ]
        hist = np.bincount(hrs, minlength=24)
        F = np.abs(np.fft.fft(hist))
        # dominant daily/half-daily
        dom_idx = int(np.argmax(F[1:12])+1)
        strength = float(F[dom_idx]/(np.mean(F)+1e-6))
        with driver.session() as s:
            s.run("""
              MATCH (a:Account {id:$id, source:$src})
              SET a.rhythm_index = $strength, a.rhythm_harmonic = $dom
            """, {"id":row["id"],"src":row["src"],"strength":round(strength,3),"dom":dom_idx})
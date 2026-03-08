#!/usr/bin/env python3
import argparse

from neo4j import GraphDatabase


def run(uri, user, pwd, ev_id):
    drv = GraphDatabase.driver(uri, auth=(user, pwd))
    with drv.session() as s:
        rec = s.run("""
          MATCH (ev:DeletionEvent)
          WHERE elementId(ev) = $ev_id OR toString(id(ev)) = $ev_id
          OPTIONAL MATCH (ev)-[:CAPTURED]->(snap:Snapshot)
          RETURN ev.payload AS payload, snap.props AS snap_props
        """, ev_id=str(ev_id)).single()

        if not rec:
            print(f"No DeletionEvent found with ID {ev_id}")
            return

        payload = rec["payload"] or rec["snap_props"]

        if not payload:
             print("No payload found to rehydrate.")
             return

        # Assuming 'MyLabel' is generic here; in real world, we might store label in DeletionEvent
        s.run("""
          CREATE (n:MyLabel $payload)
          SET n.__rehydrated_from = $ev_id
        """, payload=payload, ev_id=str(ev_id))

        print(f"Successfully rehydrated node from event {ev_id}")

    drv.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--uri", required=True)
    ap.add_argument("--user", required=True)
    ap.add_argument("--pwd", required=True)
    ap.add_argument("--ev-id", required=True)
    args = ap.parse_args()

    run(args.uri, args.user, args.pwd, args.ev_id)

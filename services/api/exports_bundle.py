from fastapi import APIRouter, Depends, Request, Response, HTTPException
from neo4j import GraphDatabase
from .auth import require_role, Role
from .crypto_sign import checksum_map, sign_manifest
from .audit import write as audit
import os, time, hashlib, json, io, zipfile, csv

router = APIRouter()
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

def _csv_bytes(headers, rows):
    s = io.StringIO(); w = csv.DictWriter(s, fieldnames=headers); w.writeheader()
    for r in rows: w.writerow(r)
    return s.getvalue().encode()

def _pdf_from_summary(case_id, summary_md):
    # Placeholder for actual PDF generation
    return f"PDF report for case {case_id}\n\n{summary_md}".encode()

@router.get("/exports/bundle/{case_id}")
async def export_bundle(case_id: str, role: str = Depends(require_role(Role.lead)), request: Request=None):
    ip = request.client.host if request and request.client else "unknown"

    # Fetch case data
    with driver.session() as s:
        case_rec = s.run("MATCH (c:Case {id:$id}) RETURN c{.*} AS case", id=case_id).single()
        if not case_rec: raise HTTPException(status_code=404, detail="Case not found")
        case_data = case_rec["case"]

        nodes_rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(a:Account)
        RETURN a.id AS id, a.source AS source, a.follower_anomaly AS follower_anomaly, a.rhythm_index AS rhythm_index
        """, id=case_id).data()

        edges_rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(a:Account)-[r:COORDINATION]-(b:Account)
        WHERE (c)-[:INCLUDES]->(b)
        RETURN a.id AS source, b.id AS target, r.score AS score, r.updated AS updated
        """, id=case_id).data()

        motifs_rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(a:Account)-[:POSTED]->(m:Message)-[:USES]->(h:Hashtag)
        RETURN h.name AS hashtag, count(DISTINCT m) AS message_count
        ORDER BY message_count DESC LIMIT 100
        """, id=case_id).data()

    # Prepare files for bundling
    files = {}
    nodes = nodes_rec # Assuming nodes_rec is already a list of dicts
    edges = edges_rec # Assuming edges_rec is already a list of dicts
    motifs = motifs_rec # Assuming motifs_rec is already a list of dicts
    summary_md = case_data.get("summary", "No summary available.")

    files["case.json"]    = json.dumps(case_data, indent=2).encode()
    files["nodes.csv"]    = _csv_bytes(["id","source","follower_anomaly","rhythm_index"], nodes)
    files["edges.csv"]    = _csv_bytes(["source","target","score","updated"], edges)
    files["motifs.csv"]   = _csv_bytes(["hashtag","message_count"], motifs)
    files["summary.md"]   = summary_md.encode()
    files["report.pdf"]   = _pdf_from_summary(case_id, summary_md)

    chks = checksum_map(files)
    signed = sign_manifest({"case_id": case_id, "checksums": chks})
    files["manifest.json"] = json.dumps(signed, indent=2).encode()

    # Create in-memory ZIP file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for name, content in files.items():
            zip_file.writestr(name, content)
    zip_buffer.seek(0)
    stamp = int(time.time())

    audit(actor=role, action="bundle_export", case_id=case_id, details={"checksums": chks, "size": zip_buffer.getbuffer().nbytes, "signature": signed["signature"]})
    return Response(content=zip_buffer.getvalue(), media_type="application/zip",
                    headers={
                        "Content-Disposition": f"attachment; filename=intelgraph_case_{case_id}_{stamp}.zip"
                    })

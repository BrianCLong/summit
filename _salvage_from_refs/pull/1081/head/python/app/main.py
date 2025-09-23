import csv
import hashlib
import json
import os
from io import StringIO
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response

from .audit import AuditMiddleware, track_audit

try:
    from weasyprint import HTML
except Exception:  # pragma: no cover - optional dependency
    HTML = None

app = FastAPI()
app.add_middleware(AuditMiddleware)


@app.post("/threat_correlation")
@track_audit("create", "threat_correlation")
async def correlate(data: dict):
    from .threat_correlation import ThreatCorrelator

    correlator = ThreatCorrelator("bolt://neo4j:7687", "neo4j", "password")
    return correlator.ingest_osint(data)


@app.post("/wargame_optimizer")
@track_audit("create", "wargame_optimizer")
async def optimize_wargame(data: dict):
    from .wargame_optimizer import WargameOptimizer

    optimizer = WargameOptimizer()
    return optimizer.analyze_logs(data)


@app.post("/sentiment_volatility")
@track_audit("create", "sentiment_volatility")
async def analyze_sentiment_volatility(data: dict):
    from .sentiment_volatility import VolatilityNexus

    nexus = VolatilityNexus()
    return nexus.process_signals(data)


@app.post("/stego_analyzer")
@track_audit("create", "stego_analyzer")
async def analyze_stego(media_data: dict):
    from .stego_analyzer import StegoAnalyzer

    analyzer = StegoAnalyzer()
    # Assuming media_data['data'] contains the base64 encoded bytes and media_data['params'] contains parameters
    return analyzer.analyze_media(media_data["data"], media_data["params"])


@app.get("/")
@track_audit("view", "root")
async def root():
    return {"message": "Strategic Intelligence Suite AI Server is running!"}


@app.get("/audit/export")
async def export_audit(investigation_id: str, format: str = "JSON"):
    log_path = Path(os.getenv("AUDIT_LOG_PATH", "audit.log"))
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="audit log not found")
    entries = []
    with log_path.open("r", encoding="utf-8") as f:
        for line in f:
            data = json.loads(line)
            data["digest"] = hashlib.sha256(line.encode("utf-8")).hexdigest()
            entries.append(data)
    fmt = format.upper()
    if fmt == "JSON":
        return {"investigation_id": investigation_id, "entries": entries}
    if fmt == "CSV":
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=entries[0].keys())
        writer.writeheader()
        writer.writerows(entries)
        return Response(content=output.getvalue(), media_type="text/csv")
    if fmt == "PDF":
        if HTML is None:
            raise HTTPException(status_code=501, detail="PDF export not available")
        rows = "".join(f"<tr>{''.join(f'<td>{v}</td>' for v in e.values())}</tr>" for e in entries)
        html = f"""
        <h1>IntelGraph Audit Report</h1>
        <p>Investigation: {investigation_id}</p>
        <table border='1'>
            <tr>{''.join(f'<th>{k}</th>' for k in entries[0].keys())}</tr>
            {rows}
        </table>
        """
        pdf_bytes = HTML(string=html).write_pdf()
        return Response(content=pdf_bytes, media_type="application/pdf")
    raise HTTPException(status_code=400, detail="unsupported format")

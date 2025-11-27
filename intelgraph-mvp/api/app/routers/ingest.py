from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request

from ..deps import get_tenant_case
from ..services.audit import audit_service
from ..services.ingest import ingest_rows

router = APIRouter()


@router.post("/ingest/csv")
async def ingest_csv(request: Request, tc=Depends(get_tenant_case)):
    graph = request.app.state.graph
    provenance_store = getattr(request.app.state, "provenance_store", None)
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        if not upload:
            raise HTTPException(status_code=400, detail="file required")
        mapping_raw = form.get("mapping")
        if not mapping_raw:
            raise HTTPException(status_code=400, detail="mapping required")
        mapping = json.loads(mapping_raw)
        provenance = json.loads(form.get("provenance") or "{}")
        policy = json.loads(form.get("policy") or "{}")
        rows = await upload.read()
    else:
        payload = await request.json()
        mapping = payload.get("mapping")
        if not mapping:
            raise HTTPException(status_code=400, detail="mapping required")
        provenance = payload.get("provenance", {})
        policy = payload.get("policy", {})
        if "data" in payload:
            rows = payload["data"]
        elif "csv" in payload:
            rows = payload["csv"].encode()
        else:
            raise HTTPException(status_code=400, detail="csv data required")

    ingest_rows(
        graph,
        rows,
        mapping,
        tc["tenant_id"],
        tc["case_id"],
        tc["user"].sub,
        provenance,
        policy,
        provenance_store,
    )
    audit_service.log(
        actor=tc["user"].sub,
        action="ingest_csv",
        tenant_id=tc["tenant_id"],
        case_id=tc["case_id"],
        target_ids=[],
        policy=policy,
    )
    return {"status": "ok"}

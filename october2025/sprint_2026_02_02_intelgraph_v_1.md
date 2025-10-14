```markdown
# IntelGraph — Multimodal Fusion & Evidence Handling Sprint (v1.4.0)
**Slug:** `sprint-2026-02-02-intelgraph-v1-4`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-02-02 → 2026-02-14 (10 business days)  
**Theme:** **Multimodal Evidence, VLM‑assisted triage, and Chain‑of‑Custody** — bring images, PDFs, and audio into IntelGraph with on‑device redaction, OCR/VLM extraction, and airtight provenance.

---
## 0) North Stars & DoD
- **One Evidence Model:** Images, PDFs, audio share a single `Evidence` graph type with transforms, hashes, and licenses.
- **Trust What You See:** OCR + VLM extraction produce claims with bounding boxes/timecodes and verifiable lineage.
- **Privacy‑First:** On‑device/object‑level redaction (faces/plates/PII) prior to upload; policies explain denials.
- **Ops SLOs:** p95 extract < 2.0s (cached); OCR throughput ≥ 30 pages/s/node on demo rig; zero P0s.

**DoD Gate:**
1) Demo: upload an image/PDF/audio → on‑device redaction → OCR/VLM extraction → claims in graph with boxes/timecodes → report export with provenance + thumbnails.  
2) Chain‑of‑custody export verifies hashes and transform chain; tamper causes failure.  
3) Policy gate blocks unsafe uploads; denial reasons visible; overrides audited.  
4) SLO dashboards show extract latencies, queue health, and redaction counts.

---
## 1) Epics → Objectives
1. **Unified Evidence Model (MM‑E1)** — Graph schema + resolvers for `Evidence`, `Transform`, `Region`, `Transcript`.
2. **OCR & VLM Extraction (MM‑E2)** — Tesseract/TrOCR OCR; VLM captions/region tags; language detection; confidence scores.
3. **On‑Device Redaction (MM‑E3)** — Face/plate/PII detectors; box/blur on client; policy enforcer.
4. **Audio Transcription (MM‑E4)** — Streaming ASR with timecodes; diarization stub; claim generation.
5. **Chain‑of‑Custody & Exports (MM‑E5)** — Hash trees, EXIF scrub, transform manifests; signed export bundle with thumbnails.
6. **Ops/QA/Docs (OPS‑E6)** — Queues, metrics, perf tests, golden sets, operator/analyst guides.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- Evidence uploader (drag‑drop) with **on‑device redaction** preview; bounding‑box editor; license selector.
- Evidence viewer: thumbnails, region overlays, timecode scrubber; claim side‑panel.
- Policy feedback: denial reasons; request‑override with justification; audit banner.

### Backend (Node/Express + Apollo + Workers + Python services)
- Evidence API + storage; EXIF scrub; hash/manifest builder.
- OCR worker (Node binding to Tesseract or Python TrOCR); VLM worker (caption + region tags via local/remote VLM).
- ASR worker (Whisper‑cpp/RT engine); diarization stub; transcript → claims.
- Policy engine hooks (OPA) for upload/redaction requirements.

### Ops/SRE & Security
- BullMQ queues with DLQ; GPU opt‑in for VLM/ASR; quotas; storage lifecycle; antivirus/clamav scan.
- Grafana panels for extract latency, queue depth, GPU util, redaction rate; alerts/runbooks.

### QA/Docs
- Golden datasets (scanned PDF, receipt, license plate blur, audio sample); E2E scripts; analyst & operator guides.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ 92 pts

### Evidence Model & Viewer (22 pts)
1. Evidence schema/resolvers + storage.  
   **AC:** `Evidence(id,type,hash,mime,license,createdAt)`; `Transform`, `Region`, `Transcript`; GraphQL queries. (**L**)
2. Viewer with overlays/timecodes.  
   **AC:** Box overlays editable; keyboard nav; timecode seek; accessibility AA+. (**L**)

### OCR & VLM (28 pts)
3. OCR worker + claim creation.  
   **AC:** Text blocks with bbox + confidence; language det.; throughput ≥ 30 pages/s/node on demo. (**XL**)
4. VLM captions/region tags.  
   **AC:** Top‑k tags per region with confidence; opt‑in remote; cost estimates shown. (**L**)

### On‑Device Redaction & Policy (18 pts)
5. Face/plate/PII detectors + blur UI.  
   **AC:** Client‑side; boxes editable; policy requires blur when sensitive detected; audit. (**L**)
6. Upload policy gate + reasons.  
   **AC:** Denials list policy + fields; override w/ justification; OPA tests. (**M**)

### Audio ASR (16 pts)
7. Streaming transcription + claims.  
   **AC:** Timecodes; diarization stub; edit & commit; provenance saved. (**L**)

### Ops/QA (8 pts)
8. Queues, metrics, AV scan, golden/E2E.  
   **AC:** Dashboards; DLQ alerts; E2E passes; AV block list. (**M**)

---
## 4) Scaffolds & Code

### 4.1 GraphQL — Evidence Types
```graphql
# server/src/graphql/evidence.graphql
scalar DateTime

enum EvidenceType { IMAGE PDF AUDIO VIDEO }

type Evidence { id: ID!, type: EvidenceType!, hash: String!, mime: String!, license: String!, createdAt: DateTime!, transforms: [Transform!]!, regions: [Region!]!, transcript: Transcript }

type Transform { id: ID!, kind: String!, params: JSON!, inputHash: String!, outputHash: String!, at: DateTime! }

type Region { id: ID!, bbox: [Float!]!, labels: [Label!]!, confidence: Float!, evidenceId: ID! }

type Label { key: String!, value: String! }

type Transcript { id: ID!, segments: [Segment!]!, language: String!, confidence: Float! }

type Segment { start: Float!, end: Float!, text: String!, speaker: String }

extend type Mutation {
  evidenceUploadRequest(meta: EvidenceMetaInput!): UploadTicket!
  evidenceCommit(ticket: ID!, blobs: [BlobInput!]!, transforms: [TransformInput!]!): Evidence!
}
```

### 4.2 Upload Flow — On‑Device Redaction (jQuery)
```js
// apps/web/src/features/evidence/jquery-upload.js
$(function(){
  let boxes = []
  $('#file').on('change', function(){
    const f = this.files[0]
    // run face/plate/PII detection locally (WebAssembly/wasm‑simd stub)
    detectPII(f).then(b=>{ boxes=b; renderBoxes(b) })
  })
  $(document).on('click','#blur-all', function(){ applyBlur(boxes) })
  $(document).on('click','#upload', function(){
    const meta = collectMeta()
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation($m:EvidenceMetaInput!){ evidenceUploadRequest(meta:$m){ id, policy { requireBlur } } }`, variables:{ m: meta } }) })
  })
})
```

### 4.3 Node — EXIF Scrub & Hashes
```ts
// server/src/evidence/ingest.ts
import { createHash } from 'crypto'
import exif from 'exifr'
export async function scrubAndHash(buf:Buffer){
  // remove EXIF (store separately if allowed)
  const meta = await exif.parse(buf).catch(()=>null)
  const clean = await stripExif(buf)
  const hash = createHash('sha256').update(clean).digest('hex')
  return { clean, hash, exif: meta }
}
```

### 4.4 OCR Worker (Node + Tesseract binding)
```ts
// workers/ocr/index.ts
import { createWorker } from 'tesseract.js'
export async function ocrImage(buf:Buffer){
  const worker = await createWorker({ logger: m=>metrics.ocrProgress(m) })
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  const { data } = await worker.recognize(buf)
  await worker.terminate()
  return data // { text, blocks:[{bbox, text, confidence}] }
}
```

### 4.5 VLM Tags (Python FastAPI)
```python
# services/vlm/app.py
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI()
class In(BaseModel):
    image: str  # base64
    regions: list | None = None
@app.post('/tag')
async def tag(inp: In):
    # stub: return pseudo tags with confidences
    return { 'tags': [ { 'bbox':[0.1,0.1,0.3,0.3], 'labels':[{'key':'object','value':'car'}], 'confidence':0.91 } ] }
```

### 4.6 ASR (Whisper‑cpp binding stub)
```ts
// workers/asr/index.ts
export async function transcribe(buf:Buffer){
  // call whisper‑cpp via child process; return segments with timecodes
  return [{ start: 0.0, end: 2.5, text: 'hello world', speaker: 'S1' }]
}
```

### 4.7 Policy Gate (OPA)
```rego
package intelgraph.upload

default allow = false

allow {
  input.meta.license != "Prohibited"
  not requires_blur
}

requires_blur {
  some r
  input.detected[r].kind == "face"
}
```

### 4.8 Chain‑of‑Custody Manifest (Node)
```ts
// server/src/provenance/custody.ts
export function custodyManifest(evidence:any, transforms:any[]){
  return {
    evidence: { id:evidence.id, hash:evidence.hash, mime:evidence.mime, createdAt:evidence.createdAt },
    transforms: transforms.map(t=>({ kind:t.kind, params:t.params, inputHash:t.inputHash, outputHash:t.outputHash, at:t.at })),
    merkle: merkle(transforms.map(t=>t.outputHash))
  }
}
```

### 4.9 Report Export — Thumbnails & Boxes
```ts
// server/src/export/report.ts
export async function renderEvidenceThumb(evidenceId:string){ /* rasterize page/region, draw boxes with labels */ }
```

### 4.10 k6 — OCR/VLM Queue Perf
```js
import http from 'k6/http'
export const options = { vus: 40, duration: '3m' }
export default function(){
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'mutation{ enqueueOcr(id:"ev1") }' }), { headers:{ 'Content-Type':'application/json' } })
}
```

---
## 5) Delivery Timeline
- **D1–D2:** Evidence schema + storage + viewer shell; EXIF scrub/hash.  
- **D3–D4:** OCR worker + claims + throughput tuning; VLM tagger + UI overlays.  
- **D5–D6:** On‑device redaction + policy gate; ASR with timecodes.  
- **D7:** Chain‑of‑custody export + thumbnails; denial reasons & overrides.  
- **D8–D10:** Perf dashboards, DLQ/runbooks, E2E & golden tests, docs, demo polish.

---
## 6) Risks & Mitigations
- **OCR/VLM cost & latency** → caching, region‑only OCR, batch pages, GPU opt‑in.  
- **Privacy leaks** → on‑device redaction defaults; policy deny‑by‑default; audits.  
- **ASR accuracy** → diarization later; human edit/commit flow; language detect route.  
- **Storage bloat** → lifecycle policies, tiering, thumbnail limits.

---
## 7) Metrics
- Extract p95/p99; OCR throughput; redaction count; ASR WER on golden; DLQ depth; cache hit; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑029:** Unified Evidence & Transform model.  
- **ADR‑030:** On‑device redaction policy & UI.  
- **RFC‑029:** OCR/VLM/ASR services & budgets.  
- **Runbooks:** DLQ drain; redaction override; custody verification; throughput tuning.  
- **Docs:** Evidence upload guide; Redaction how‑to; Multimodal analysis walk‑through.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Upload image → auto‑detect faces → blur client‑side → upload passes policy gate.  
2) OCR + VLM produce text/region tags with confidences; click a box to see claim details & provenance.  
3) Upload audio → transcript with timecodes → create claims → link into graph.  
4) Export report with thumbnails + custody manifest → run verifier → tamper causes failure.

---
## 11) Out‑of‑Scope (backlog)
- Full video pipeline; advanced diarization; multilingual OCR at scale; semantic region linking; on‑device VLM quantization.
```


````markdown
# IntelGraph — Video & Geospatial Intelligence Sprint (v1.5.0)

**Slug:** `sprint-2026-02-16-intelgraph-v1-5`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-02-16 → 2026-02-27 (10 business days)  
**Theme:** **Video + Geo:** spatiotemporal analytics, tracking, and map intelligence with strict privacy guardrails.

---

## 0) North Stars & DoD

- **End‑to‑end video intel:** Ingest → keyframes → detection → multi‑object tracking → claims with timecodes.
- **Geo‑first reasoning:** H3/geohash & PostGIS indices; map + timeline stay in lockstep; geofences & routes.
- **Privacy by default:** Face/plate/video‑region blurs; license propagation; export masks verified.
- **Ops SLOs:** p95 clip inspect < **1.2s** (cached); processing throughput ≥ **30 fps/worker** (demo); spatiotemporal query p95 < **800ms**.

**DoD Gate:**

1. Demo: upload video → keyframes & track IDs → geo overlay on map → timeline scrub synced → export with redactions.
2. Spatiotemporal query returns entities **inside** a geofence over T; denial reasons for blocked fields.
3. SLO dashboards: processing fps, detector latency, map query p95; error budgets in green.

---

## 1) Epics → Objectives

1. **Video Pipeline (VID‑E1)** — ffmpeg extract, detector+tracker, timecoded claims, thumbnails, redaction.
2. **Geo Indexing (GEO‑E2)** — H3/geohash tiling, PostGIS store, heatmaps, route/path queries.
3. **Spatiotemporal API (STA‑E3)** — GraphQL for geofences, near‑me, co‑location, dwell time.
4. **Privacy & Export (PRV‑E4)** — Video region masks, export with blur proofs, OPA gates.
5. **Ops & Cost (OPS‑E5)** — GPU sched/HPA, tile caching, metrics; cost caps for detectors.
6. **QA & Docs (QA‑E6)** — Golden videos, geo fixtures, E2E, operator/analyst guides.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- Video player w/ **bbox overlays**, track IDs, and timeline scrub.
- Map (Leaflet) with geofence editor, heatmaps, and route traces.
- Spatiotemporal query builder; saved geofences; export preview with mask diff.

### Backend (Node/Express + Apollo + Neo4j + Postgres/PostGIS + Python workers)

- ffmpeg keyframe extraction; object **detector** + IOU/DeepSORT‑like **tracker**.
- Claim writer (timecodes), perceptual hash, region store; EXIF→geo; manual geo tagger.
- Geo indices (H3/geohash), PostGIS tables, GraphQL spatiotemporal resolvers.

### Ops/SRE & Security

- GPU node pools (optional), worker HPA, tile cache/CDN; Prom/Grafana panels.
- OPA policy for video redaction & geofence export; antivirus on upload.

### QA/Docs

- Golden sets (traffic cam, storefront, bodycam); geo fixtures; E2E scripts; analyst & operator docs.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Video Pipeline (32 pts)

1. ffmpeg keyframe extraction & thumbnails.  
   **AC:** Keyframes every N ms; perceptual hash; thumbnails stored; manifest updated. (**L**)
2. Detector + tracker workers (bbox + trackId).  
   **AC:** Track continuity across occlusion; ≥ 30 fps/worker on demo; confidence per frame. (**XL**)
3. Timecoded claim writer.  
   **AC:** `CLAIM(seenAt=[t0,t1], bbox, labels)` persisted; provenance chain kept. (**M**)

### Geo Indexing (24 pts)

4. H3/geohash tiling + PostGIS tables.  
   **AC:** Points/paths indexed; ST_DWithin & geofence queries < 800ms p95. (**L**)
5. Heatmap & route overlay endpoints.  
   **AC:** Aggregations per tile; route polyline returned; cache headers set. (**M**)

### Spatiotemporal API (18 pts)

6. Geofence & dwell GraphQL queries.  
   **AC:** Entities in polygon over [t0,t1]; dwell > X min; pagination; ABAC enforced. (**L**)
7. Co‑location query.  
   **AC:** Return pairs within R meters within Δt; policy‑aware masks. (**M**)

### Privacy & Export (12 pts)

8. Video redaction masks & export verification.  
   **AC:** Blur boxes applied to export; verifier checks mask manifest; OPA reasons shown on deny. (**M**)

### QA/Docs (6 pts)

9. Golden videos/geo fixtures + E2E.  
   **AC:** CI passes; screenshots & metrics archived; analyst/operator docs updated. (**S**)

---

## 4) Architecture & Scaffolds

### 4.1 GraphQL (Video + Geo)

```graphql
# server/src/graphql/video.geo.graphql
scalar DateTime

enum VideoCodec {
  H264
  H265
  VP9
  AV1
}

type VideoEvidence {
  id: ID!
  hash: String!
  mime: String!
  codec: VideoCodec
  duration: Float!
  width: Int!
  height: Int!
  createdAt: DateTime!
  tracks: [Track!]!
  keyframes: [Keyframe!]!
}

type Track {
  id: ID!
  label: String!
  frames: [FrameBBox!]!
  confidence: Float!
}

type FrameBBox {
  t: Float!
  bbox: [Float!]!
  conf: Float!
}

type Keyframe {
  t: Float!
  thumb: String!
}

type GeoEvent {
  entityId: ID!
  lat: Float!
  lon: Float!
  t: DateTime!
  h3: String
}

type Query {
  geofenceEntities(
    polygon: [[Float!]!]!
    from: DateTime!
    to: DateTime!
    minDwellMinutes: Int = 0
  ): [GeoEvent!]!
  coLocated(a: ID!, b: ID!, meters: Int = 25, deltaSeconds: Int = 120): Boolean!
}
```
````

### 4.2 ffmpeg Extraction (Node)

```ts
// server/src/video/extract.ts
import { spawn } from 'child_process';
import { createHash } from 'crypto';
export async function extractKeyframes(path: string, everyMs = 1000) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      path,
      '-vf',
      `fps=1/${everyMs / 1000}`,
      '-qscale:v',
      '2',
      '-f',
      'image2pipe',
      '-',
    ];
    const ff = spawn('ffmpeg', args);
    const frames: Buffer[] = [];
    ff.stdout.on('data', (d) => frames.push(Buffer.from(d)));
    ff.on('close', () => {
      const thumbs = frames.map((buf, i) => ({
        t: (i * everyMs) / 1000,
        thumb: buf.toString('base64'),
        phash: ahash(buf),
      }));
      resolve(thumbs);
    });
    ff.on('error', reject);
  });
}
function ahash(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}
```

### 4.3 Detector + Tracker (Python FastAPI, IOU tracker)

```python
# services/vid/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
app = FastAPI()

class Frame(BaseModel):
    t: float
    image_b64: str

class Box(BaseModel):
    t: float
    bbox: List[float]  # [x,y,w,h]
    label: str = "person"
    conf: float = 0.9

@app.post('/detect')
async def detect(frames: List[Frame]):
    # stub: return one box per frame; real impl would call a detector (e.g., YOLO) then track
    return [{"t":f.t, "bbox":[0.1,0.1,0.2,0.2], "label":"person", "conf":0.9} for f in frames]
```

### 4.4 Timecoded Claim Writer (Node)

```ts
// server/src/video/claims.ts
export async function writeClaims(
  videoId: string,
  detections: { t: number; bbox: number[]; label: string; conf: number }[],
  ctx: any,
) {
  for (const d of detections) {
    await ctx.driver.executeQuery(
      `MATCH (v:VideoEvidence {id:$vid})
       MERGE (c:Claim {id: randomUUID()})
       SET c.predicate='detected', c.object=$label, c.confidence=$conf, c.observedAt=datetime({epochSeconds: toInteger($t)}), c.bbox=$bbox
       MERGE (v)-[:YIELDED]->(c)`,
      {
        vid: videoId,
        label: d.label,
        conf: d.conf,
        t: Math.floor(d.t),
        bbox: d.bbox,
      },
    );
  }
}
```

### 4.5 PostGIS Tables & Indexing (SQL)

```sql
-- ops/db/postgis.sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS geo_events (
  id BIGSERIAL PRIMARY KEY,
  entity_id TEXT NOT NULL,
  t TIMESTAMPTZ NOT NULL,
  geom GEOGRAPHY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_geo_events_time ON geo_events (t);
CREATE INDEX IF NOT EXISTS idx_geo_events_geom ON geo_events USING GIST (geom);
-- geofence query
-- SELECT * FROM geo_events WHERE t BETWEEN $1 AND $2 AND ST_Within(geom, ST_GeogFromText($WKT_POLYGON));
```

### 4.6 Spatiotemporal Resolver (Node/Apollo)

```ts
// server/src/graphql/resolvers/geo.ts
import { sql } from '../pg';
export default {
  Query: {
    geofenceEntities: async (
      _: any,
      {
        polygon,
        from,
        to,
        minDwellMinutes,
      }: {
        polygon: number[][];
        from: string;
        to: string;
        minDwellMinutes: number;
      },
    ) => {
      const wkt = polyToWKT(polygon);
      const rows = await sql`
        SELECT entity_id, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon, t
        FROM geo_events
        WHERE t BETWEEN ${from} AND ${to}
          AND ST_Within(geom, ST_GeogFromText(${wkt}))`;
      return rows.map((r: any) => ({
        entityId: r.entity_id,
        lat: r.lat,
        lon: r.lon,
        t: r.t,
      }));
    },
    coLocated: async (
      _: any,
      {
        a,
        b,
        meters,
        deltaSeconds,
      }: { a: string; b: string; meters: number; deltaSeconds: number },
    ) => {
      const rows = await sql`
        SELECT 1 FROM geo_events ga JOIN geo_events gb
        ON ga.entity_id=${a} AND gb.entity_id=${b}
        AND ABS(EXTRACT(EPOCH FROM (ga.t - gb.t))) <= ${deltaSeconds}
        AND ST_DWithin(ga.geom, gb.geom, ${meters}) LIMIT 1`;
      return rows.length > 0;
    },
  },
};
function polyToWKT(poly: number[][]) {
  const s = poly.map(([lat, lon]) => `${lon} ${lat}`).join(',');
  return `POLYGON((${s}))`;
}
```

### 4.7 jQuery — Video Overlays & Geofences

```js
// apps/web/src/features/video/jquery-overlays.js
$(function () {
  const $vid = $('#video');
  const $ovl = $('#overlay');
  $(document).on('timeupdate', '#video', function () {
    const t = this.currentTime;
    // fetch bboxes for t and draw
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `{ bboxesAt(videoId:"${$vid.data('id')}", t:${t.toFixed(2)}){ bbox, label, conf } }`,
      }),
    });
  });
});
```

```js
// apps/web/src/features/geo/jquery-geofence.js
$(function () {
  let fence = [];
  $('#map').on('click', function (e) {
    fence.push([e.latlng.lat, e.latlng.lng]);
    drawFence(fence);
  });
  $('#run-geofence').on('click', function () {
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `{ geofenceEntities(polygon:${JSON.stringify(fence)}, from:"${$('#t0').val()}", to:"${$('#t1').val()}"){ entityId, lat, lon, t } }`,
      }),
    });
  });
});
```

### 4.8 OPA — Video Redaction Policy

```rego
package intelgraph.video

default allow = false

allow {
  input.export.kind == "video"
  not needs_redaction
}

needs_redaction {
  some b
  input.metadata.boxes[b].label == "face"
  input.metadata.boxes[b].blurred == false
}
```

### 4.9 Helm GPU/HPA Snippet

```yaml
# ops/helm/values.video.yaml
workers:
  video:
    nodeSelector: { accelerator: nvidia }
    resources:
      limits: { nvidia.com/gpu: 1, cpu: '2', memory: '8Gi' }
    autoscaling:
      enabled: true
      minReplicas: 1
      maxReplicas: 6
      targetCPUUtilizationPercentage: 70
```

### 4.10 k6 — Ingest + Geo Query Mix

```js
import http from 'k6/http';
export const options = { vus: 50, duration: '3m' };
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query:
        '{ geofenceEntities(polygon:[[40.7,-74.0],[40.8,-74.0],[40.8,-73.9],[40.7,-73.9],[40.7,-74.0]], from:"2026-02-16T00:00:00Z", to:"2026-02-17T00:00:00Z"){ entityId } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** ffmpeg extraction, thumbnails, pHash; schema & storage.
- **D3–D4:** Detector+tracker workers; timecoded claim writer; bbox overlays UI.
- **D5–D6:** Geo indices, PostGIS resolvers, heatmaps/routes; geofence editor.
- **D7:** Privacy & export masks + verifier; OPA deny reasons in UI.
- **D8–D10:** Perf dashboards, GPU/HPA tuning, QA E2E, docs, demo polish.

---

## 6) Risks & Mitigations

- **Detector drift/cost** → model pinning, batched inference, region‑of‑interest, GPU autoscaling.
- **Geo precision** → snap to H3 resolution; display uncertainty; allow manual corrections.
- **Privacy misses** → default‑blur faces/plates; export gate; human review queue.
- **Storage bloat** → frame sampling, thumbnail tiers, lifecycle policies.

---

## 7) Metrics

- Processing fps, detector/track p95; geofence/co‑locate p95; heatmap cache hit; masked‑export count; GPU util; error budgets.

---

## 8) Release Artifacts

- **ADR‑030:** Video pipeline design & provenance.
- **ADR‑031:** Geo indexing (H3/geohash + PostGIS) & resolvers.
- **RFC‑030:** Video redaction policy & export verification.
- **Runbooks:** GPU pool scale‑out; detector failures; tile cache warm; export mask audit.
- **Docs:** Analyst video/geo playbook; operator geo/tiles guide.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Upload video → auto keyframes → detector+tracker produce tracks; scrub timeline with overlays.
2. Draw geofence on map → run spatiotemporal query; filter results; show dwell times.
3. Export redacted clip w/ mask manifest → run verifier; show OPA denial on unblurred faces.
4. Grafana: fps, query p95, GPU util, mask counts.

---

## 11) Out‑of‑Scope (backlog)

- Full video object re‑identification; multi‑camera calibration; SLAM; 3D geofences; online learning; federated geo analytics.

```

```

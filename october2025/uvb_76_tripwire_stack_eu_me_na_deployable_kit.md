# UVB-76 / Pip / Squeaky Wheel — Passive Monitoring & Tripwire Kit

**Classification:** Unclassified // Public RF Collection // Audit-Ready  
**Author:** UNIT 83M  
**Purpose:** Receive-only monitoring of Russian HF marker networks with automated detections, clips, and audit artifacts.

---

## 0) Quickstart (15–30 min)

1. **Pick three public SDRs** (EU primary, ME backup, NA witness). Examples: any **KiwiSDR** or **WebSDR** with reliable uptime. *You must obey each host’s usage policy and time limits.*
2. **Create a working dir** and copy this kit in.
3. **Start recording** (choose one path):
   - **KiwiSDR** (recommended): install `kiwiclient` (Python) and run the provided `record_kiwi.sh` with your SDR hosts.
   - **Generic HTTP/MP3 stream (WebSDR/Icecast)**: use `record_ffmpeg.sh` with stream URLs.
4. **Run the detector**: `python3 detector/detector.py --config config/config.yaml`  
   It watches `captures/` for rolling WAV chunks, emits JSONL events to `events/`, clips to `clips/`, and spectrograms to `specs/`.
5. **Ship artifacts**: optional sync script pushes JSONL+WAV+PNG to S3/Azure Blob/GCS.

> **Legal & Safety**: Receive-only. No transmissions, jamming, or interference. Retain audio 30 days unless escalated.

---

## 1) Frequencies & windows (pre-loaded)

- **The Buzzer (UVB-76):** 4625 kHz USB, 24/7 marker; busiest weekdays 04:00–14:00 UTC.
- **The Pip:** 5448 kHz (day), 3756 kHz (night), USB.
- **The Squeaky Wheel:** 5367 kHz (day), 3363.5 kHz (night), USB.

> These are pre-set in `config.yaml` for alert tagging & scheduling logic. Adjust if local logs indicate shifts.

---

## 2) File tree

```
uvb76-tripwire/
├─ config/
│  └─ config.yaml
├─ detector/
│  └─ detector.py
├─ scripts/
│  ├─ record_kiwi.sh
│  ├─ record_ffmpeg.sh
│  └─ ship_s3.sh
├─ schema/
│  ├─ event.schema.json
│  ├─ sigma-uvb76-marker.yml
│  └─ opensearch-index.json
├─ specs/         # spectrogram PNGs (auto)
├─ clips/         # ±90 s WAV clips (auto)
├─ captures/      # rolling raw chunks from recorders
└─ events/
   └─ events.jsonl
```

---

## 3) Config — `config/config.yaml`

```yaml
# UTC is the system time. User timezone: America/Denver.
station_profiles:
  buzzer:
    name: "The Buzzer"
    tags: [uvb76, buzzer, 4625khz, usb]
    freq_khz: 4625.0
    day_night: none
  pip_day:
    name: "The Pip (day)"
    tags: [pip, 5448khz, usb]
    freq_khz: 5448.0
  pip_night:
    name: "The Pip (night)"
    tags: [pip, 3756khz, usb]
    freq_khz: 3756.0
  squeak_day:
    name: "The Squeaky Wheel (day)"
    tags: [squeaky, 5367khz, usb]
    freq_khz: 5367.0
  squeak_night:
    name: "The Squeaky Wheel (night)"
    tags: [squeaky, 3363_5khz, usb]
    freq_khz: 3363.5

recorders:
  # Replace host/stream with your chosen public SDRs.
  # Use up to three concurrently for path diversity.
  eu_primary:
    label: EU-NL-01
    type: kiwi   # kiwi|http
    host: kiwisdr.example.net:8073
    freq_khz: 4625.0
    mode: usb
  me_backup:
    label: ME-XX-01
    type: kiwi
    host: kiwisdr.me.example.org:8073
    freq_khz: 5448.0
    mode: usb
  na_witness:
    label: NA-US-EC-01
    type: http
    stream: https://websdr.example.com:8901/stream.mp3?f=4625usb

paths:
  captures: ./captures
  clips: ./clips
  specs: ./specs
  events: ./events/events.jsonl

retention_days: 30

# Detection thresholds (tune on first day)
vad:
  frame_ms: 30
  energy_floor_db: -50.0
  speech_min_sec: 3.0
marker:
  tone_hz_approx: 1000
  expected_rate_per_min: 25
  rate_tolerance_pct: 20
  snr_trigger_db: 3.0
clip_padding_sec: 90
```

---

## 4) KiwiSDR recorder — `scripts/record_kiwi.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-"captures"}
mkdir -p "$OUT"
# Requires: Python kiwiclient (kiwirecorder.py). One process per station.
# Example usage (edit hosts):
#   ./scripts/record_kiwi.sh captures

# Buzzer EU primary
python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.example.net -p 8073 \
  -f 4625.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "$OUT" -D buzzer_eu_%Y%m%d_%H%M%S.wav &

# Pip ME backup (daytime 05–17 UTC suggested)
python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.me.example.org -p 8073 \
  -f 5448.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "$OUT" -D pip_me_%Y%m%d_%H%M%S.wav &

# NA witness (Buzzer)
python3 -m kiwiclient.kiwirecorder \
  -s kiwisdr.na.example.com -p 8073 \
  -f 4625.0 -m usb -L 300 -H 3000 \
  -T 0 -r -w -q 1 \
  -o "$OUT" -D buzzer_na_%Y%m%d_%H%M%S.wav &

wait
```

> Notes: `-L/-H` set audio passband; `-w` writes WAV; `-q 1` disables compression; rotate files externally (use `logrotate` or `cron`).

---

## 5) Generic HTTP recorder — `scripts/record_ffmpeg.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
STREAM_URL=$1
LABEL=$2
OUT_DIR=${3:-"captures"}
mkdir -p "$OUT_DIR"
# Requires: ffmpeg
# Usage: ./scripts/record_ffmpeg.sh "https://websdr.example/stream.mp3?f=4625usb" buzzer_http captures
while true; do
  TS=$(date -u +%Y%m%d_%H%M%S)
  ffmpeg -hide_banner -loglevel error -i "$STREAM_URL" \
    -ac 1 -ar 8000 -f segment -segment_time 300 \
    -strftime 1 "$OUT_DIR/${LABEL}_%Y%m%d_%H%M%S.wav" || true
  sleep 1
done
```

---

## 6) Detector — `detector/detector.py`

```python
#!/usr/bin/env python3
import argparse, json, os, sys, time, math
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, stft
import yaml

# Simple energy-based VAD + buzzer marker heuristic

def bandpass(sig, fs, low=300, high=3000, order=4):
    b, a = butter(order, [low/(fs/2), high/(fs/2)], btype='band')
    return lfilter(b, a, sig)

def rms_db(x):
    e = np.sqrt(np.mean(x**2)+1e-12)
    return 20*np.log10(e+1e-12)

def detect_speech(sig, fs, frame_ms=30, floor_db=-50.0, min_sec=3.0):
    n = int(fs*frame_ms/1000)
    frames = [sig[i:i+n] for i in range(0, len(sig), n)]
    db = np.array([rms_db(f) for f in frames if len(f)==n])
    thr = max(np.median(db), floor_db) + 6.0
    speech = db > thr
    # longest contiguous run
    run, best = 0, 0
    for v in speech:
        run = run+1 if v else 0
        best = max(best, run)
    dur = best * frame_ms / 1000.0
    return dur >= min_sec

def detect_marker(sig, fs, tone_hz=1000, expect_per_min=25, tol_pct=20, snr_db=3.0):
    # Short-time FFT magnitude around tone
    f, t, Z = stft(sig, fs=fs, nperseg=1024, noverlap=768)
    mag = np.abs(Z)
    idx = np.argmin(np.abs(f - tone_hz))
    tone = mag[idx,:]
    bg = np.median(mag, axis=0)
    snr = 20*np.log10((tone+1e-9)/(bg+1e-9))
    peaks = snr > snr_db
    # estimate rate per minute
    if len(t) < 2:
        return False, 0.0
    total_min = (t[-1]-t[0]) / 60.0
    rate = peaks.sum()/max(total_min,1e-3)
    ok = abs(rate - expect_per_min) <= expect_per_min*tol_pct/100.0
    return ok, rate

def spectrogram_png(sig, fs, out):
    import matplotlib.pyplot as plt
    plt.figure()
    plt.specgram(sig, Fs=fs, NFFT=1024, noverlap=768)
    plt.title("Spectrogram")
    plt.xlabel("Time [s]")
    plt.ylabel("Freq [Hz]")
    plt.savefig(out, dpi=150)
    plt.close()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    args = ap.parse_args()
    cfg = yaml.safe_load(open(args.config))
    paths = cfg['paths']
    capdir = Path(paths['captures']); clipdir = Path(paths['clips'])
    specdir = Path(paths['specs']); events_path = Path(paths['events'])
    for d in [capdir, clipdir, specdir, events_path.parent]: d.mkdir(parents=True, exist_ok=True)

    seen = set()
    while True:
        wavs = sorted(capdir.glob('*.wav'))
        for w in wavs:
            if w in seen: continue
            try:
                sig, fs = sf.read(str(w))
                sig = bandpass(sig.astype(np.float32), fs)
                speech = detect_speech(sig, fs, cfg['vad']['frame_ms'], cfg['vad']['energy_floor_db'], cfg['vad']['speech_min_sec'])
                marker_ok, rate = detect_marker(sig, fs, int(cfg['marker']['tone_hz_approx']), cfg['marker']['expected_rate_per_min'], cfg['marker']['rate_tolerance_pct'], cfg['marker']['snr_trigger_db'])
                evt_type = None
                if speech:
                    evt_type = 'voice'
                elif marker_ok:
                    evt_type = 'marker'
                if evt_type:
                    # write clip copy and spectrogram
                    clip_path = clipdir / w.name
                    spec_path = specdir / (w.stem + '.png')
                    sf.write(str(clip_path), sig, fs)
                    spectrogram_png(sig, fs, str(spec_path))
                    event = {
                        'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                        'file': w.name,
                        'snr_trigger_db': cfg['marker']['snr_trigger_db'],
                        'marker_rate_est_per_min': round(rate,2),
                        'type': evt_type,
                        'freq_khz_hint': None,
                        'sensor_id_hint': None,
                        'sha256': __import__('hashlib').sha256(open(clip_path,'rb').read()).hexdigest()
                    }
                    with open(events_path, 'a') as f:
                        f.write(json.dumps(event)+'\n')
            except Exception as e:
                print(f"[warn] {w}: {e}")
            finally:
                seen.add(w)
        time.sleep(2)

if __name__ == '__main__':
    main()
```

---

## 7) Event schema — `schema/event.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["utc","file","type","sha256"],
  "properties": {
    "utc": {"type": "string", "format": "date-time"},
    "file": {"type": "string"},
    "type": {"type": "string", "enum": ["marker","voice"]},
    "snr_trigger_db": {"type": "number"},
    "marker_rate_est_per_min": {"type": "number"},
    "freq_khz_hint": {"type": ["number","null"]},
    "sensor_id_hint": {"type": ["string","null"]},
    "sha256": {"type": "string"}
  }
}
```

---

## 8) Sigma (reference) — `schema/sigma-uvb76-marker.yml`

```yaml
title: UVB-76 / Pip / Squeaky Wheel HF Event
id: 5c6d7f84-8b62-44d2-9a6a-uvb76
status: experimental
description: Detects voice bursts or valid marker cadence near target freqs.
author: UNIT 83M
date: 2025/10/01
logsource:
  product: custom
  service: hf-monitor
  category: application

detection:
  selection_voice:
    type: "voice"
  selection_marker:
    type: "marker"
  condition: selection_voice or selection_marker

fields:
  - utc
  - type
  - marker_rate_est_per_min
  - sha256
falsepositives:
  - Local QRM, adjacent channel interference
level: medium
```

---

## 9) OpenSearch index (optional) — `schema/opensearch-index.json`

```json
{
  "settings": {"index": {"number_of_shards": 1}},
  "mappings": {
    "properties": {
      "utc": {"type": "date"},
      "type": {"type": "keyword"},
      "marker_rate_est_per_min": {"type": "float"},
      "sha256": {"type": "keyword"}
    }
  }
}
```

---

## 10) SOAR playbook (condensed)

**Trigger:** `events.jsonl` new line where `type == voice` OR `marker_rate_est_per_min` within ±20% of expected.  
**Steps:**
1. Hash verify → store clip/spec immutable.  
2. Tag by station based on filename/recorder → add `freq_khz_hint`.  
3. Notify channel with UTC, station, SNR/rate, artifacts.  
4. Correlate with Priyom logs (manual/semiauto).  
5. Escalate if ≥3 voice events/24h across ≥2 sensors.

---

## 11) Governance

- **Retention:** 30d rolling (`captures/` 7d, `clips/` 30d, `events/` 365d).  
- **Access:** least-privilege; read-only analysts; upload-only recorder.  
- **Chain-of-custody:** SHA-256 on clip files; keep event+hash together.

---

## 12) Tuning notes

- Expect ~**25 buzzer pulses/min** near 1 kHz; set `snr_trigger_db` between 2–5 dB depending on SDR SNR.
- Voice bursts typically exceed energy threshold for ≥3 s; adjust `speech_min_sec` if over/under-firing.
- Propagation: from America/Denver, NA witness best **02:00–09:00 UTC**; EU primary **04:00–14:00 UTC** on weekdays.

---

## 13) Verification checklist (DoD-83M)

- [ ] At least one **marker** event within 24 h (EU sensor).  
- [ ] One **voice** or null-report in first 7 days with propagation notes.  
- [ ] Hashes validate for all shipped clips.  
- [ ] Retention and access controls validated.


---

## 14) Cloud auto-upload (S3/Azure/GCS)

Add one block to `config/config.yaml` and enable the shipper.

```yaml
upload:
  enabled: true
  provider: s3   # s3|azure|gcs
  s3:
    bucket: your-bucket-name
    prefix: uvb76/
    region: us-east-1
    # credentials from env: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
  azure:
    container: your-container
    prefix: uvb76/
    # creds via env: AZURE_STORAGE_CONNECTION_STRING or MSI
  gcs:
    bucket: your-bucket
    prefix: uvb76/
    # creds via env: GOOGLE_APPLICATION_CREDENTIALS (JSON key)
```

**Shipper script — `scripts/ship_objects.py`**
```python
#!/usr/bin/env python3
import os, sys, time, hashlib, json
from pathlib import Path
import boto3
from google.cloud import storage as gcs
from azure.storage.blob import BlobServiceClient
import yaml

CFG = yaml.safe_load(open('config/config.yaml'))
prov = CFG.get('upload',{}).get('provider')
root = Path('.')

class Uploader:
    def put(self, rel_path, blob_name):
        raise NotImplementedError

class S3(Uploader):
    def __init__(self, bucket):
        self.bucket = bucket
        self.s3 = boto3.client('s3')
    def put(self, rel_path, blob_name):
        self.s3.upload_file(str(rel_path), self.bucket, blob_name, ExtraArgs={'ChecksumAlgorithm':'SHA256'})

class Azure(Uploader):
    def __init__(self, container):
        self.cli = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING',''))
        self.cnt = self.cli.get_container_client(container)
    def put(self, rel_path, blob_name):
        with open(rel_path,'rb') as f:
            self.cnt.upload_blob(name=blob_name, data=f, overwrite=True)

class GCS(Uploader):
    def __init__(self, bucket):
        self.cli = gcs.Client()
        self.bkt = self.cli.bucket(bucket)
    def put(self, rel_path, blob_name):
        blob = self.bkt.blob(blob_name)
        blob.upload_from_filename(rel_path)

if __name__ == '__main__':
    if not CFG.get('upload',{}).get('enabled', False):
        print('upload disabled'); sys.exit(0)
    prefix = CFG['upload'].get(CFG['upload']['provider'],{}).get('prefix','')
    if prov == 's3': up = S3(CFG['upload']['s3']['bucket'])
    elif prov == 'azure': up = Azure(CFG['upload']['azure']['container'])
    elif prov == 'gcs': up = GCS(CFG['upload']['gcs']['bucket'])
    else: print('unknown provider'); sys.exit(1)

    # ship new files from clips/, specs/, events.jsonl (tail)
    paths = [Path('clips'), Path('specs')]
    for p in paths:
        p.mkdir(exist_ok=True)
        for f in sorted(p.glob('*')):
            rel = f
            blob = prefix + str(rel).replace('\','/')
            up.put(rel, blob)
    # ship events.jsonl
    ev = Path('events/events.jsonl')
    if ev.exists():
        up.put(ev, prefix + 'events/events.jsonl')
```

**Cron example** (every 5 minutes):
```cron
*/5 * * * * cd /opt/uvb76-tripwire && /usr/bin/python3 scripts/ship_objects.py >> ship.log 2>&1
```

---

## 15) Extended watchlist (D, T, Air Horn + more)

Add to `config/config.yaml` → `station_profiles`:

```yaml
  d_marker:
    name: "D Marker"
    tags: [marker, d, 5292khz]
    freq_khz: 5292.0
  t_marker:
    name: "T Marker"
    tags: [marker, t, 4325khz]
    freq_khz: 4325.0
  air_horn:
    name: "The Air Horn"
    tags: [airhorn, 4930khz]
    freq_khz: 4930.0
  goose:
    name: "The Goose"
    tags: [goose, 4310khz]
    freq_khz: 4310.0
  alarm:
    name: "The Alarm"
    tags: [alarm, 4770khz]
    freq_khz: 4770.0
```

Duplicate your recorder blocks if you want parallel jobs on these freqs. (Frequencies sourced from Priyom’s Russia index.)

---

## 16) Wideband scan mode (HF 2–30 MHz)

**Goal:** catch **numbers/microbursts/oddities** beyond the fixed nets.

**Approach:** fast step-tune + dwell + burst detector.

**Config add**:
```yaml
scanner:
  enabled: true
  start_khz: 2000
  end_khz: 30000
  step_khz: 5      # tune step (receiver dependent)
  dwell_sec: 4     # audio capture per step
  max_parallel: 1  # one tuner per SDR
  known_avoid:
    - 4625.0
    - 5448.0
    - 3756.0
    - 5367.0
    - 3363.5
```

**Scanner script — `scripts/scan_hf.py`** (pseudo-implementation using a KiwiSDR/WebSDR abstraction). It tunes, records short WAVs, and runs the same detector with a **burst-mode heuristic** (energy variance + duration 0.2–5 s, optional cyclostationary check). Output lines go to `events.jsonl` with `type: burst`.

```python
# (Abbreviated for canvas) Core loop:
# for f in np.arange(start,end,step): tune(f)->capture(dwell)->analyze()->emit(event if burst)
```

**Burst heuristic (detector augmentation):**
- frame 10 ms; compute short-term energy and spectral flux; 
- detect onsets with >8 dB over median in 200 ms; 
- accept if duration 0.2–5 s and bandwidth <4 kHz (AM/USB voice or digital bursts). 

---

## 17) Numbers-fusion enrichers (Priyom + SpyNumbers)

**New module — `scripts/enrich_numbers.py`**: periodically pull & parse public schedules/loggings from **Priyom** and **SpyNumbers** to enrich events with nearest-known station matches (by freq ±3 kHz & UTC window).

**Config add**:
```yaml
enrichment:
  enabled: true
  sources:
    - priyom_numbers
    - spynumbers_db
  freq_tolerance_khz: 3
  time_window_min: 30
```

**Event augmentation:** add `candidate_station`, `source_hint` fields; emit to a side-car file `events/enriched.jsonl` for SIEM.

> Note: these sites do not publish a stable public API; use polite scraping with cache & backoff; store only minimal metadata (station label, freq, window) and link back to sources for manual review.

---

## 18) AI/ML & data fusion — **traffic analysis**, not content-breaking

**Legal/ethical reality:** A correctly implemented **one-time pad (OTP)** is **information-theoretically unbreakable**; decryption requires key compromise or **implementation errors** (e.g., pad reuse), as demonstrated historically by **VENONA**. Our focus stays on **lawful, passive metadata analysis** and **misuse detection**, not message decryption.

**Non-content objectives:**
- **Key-reuse tripwire:** if two bursts appear to be the same station and show identical symbol statistics/lengths at similar times, flag potential pad reuse for human review.
- **Traffic fingerprinting:** learn per-station cadence, scheduling, and preambles to cluster networks and correlate to operational tempos.
- **Anomaly detection:** detect deviations (voice vs. marker interruptions, unusual schedules, sudden SNR shifts, frequency hops).

**Feature set (per event):** UTC, freq, SNR, bandwidth, modulation hints, burst length, inter-burst intervals, geo-SNR map from multi-SDR SNR triangulation, enrichment candidates.

**Models:**
- **Unsupervised clustering** (e.g., HDBSCAN on cadence features) to group events by station/network.
- **Change-point detection** on time series per station (e.g., Bayesian online changepoint) to spot ops tempo surges.
- **Hidden Markov Models** for preamble→message structure to characterize formats without decoding.

**Misuse-only crypto checks (high level):**
- **Ciphertext-ciphertext correlation**: if the same keystream was reused (rare), XOR of two ciphertexts yields **plaintext XOR**, enabling crib-based inference (documented in VENONA). We will **only** flag statistical evidence of reuse; **no decryption attempts**.

**Outputs:** dashboards (counts, bursts, shifts), station clusters, surge alerts, and **reuse-suspect** flags.

**Safeguards:** strict receive-only; no attempt to defeat lawful encryption; preserve hashes and provenance for all artifacts.

---

## 19) KPIs & verification (extended)

- **Coverage:** ≥85% of fixed-net windows monitored; scanner sweeps 2–30 MHz in <2 hours.
- **Fidelity:** <10% false-positives on burst detector after 1 week tuning.
- **Fusion hit-rate:** ≥60% of events enriched with a candidate station from Priyom/SpyNumbers.
- **Integrity:** 100% of artifacts uploaded with valid checksums; SIEM index fresh <10 min lag.


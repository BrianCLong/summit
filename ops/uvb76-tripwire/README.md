# UVB-76 / Pip / Squeaky Wheel Passive Monitoring Kit

This toolkit provisions receive-only workflows for monitoring Russian HF marker and numbers networks. It combines public SDR recordings with automated detection, enrichment, and optional cloud shipping.

## Layout

```
ops/uvb76-tripwire/
├─ config/config.yaml        # Station profiles, recorder hints, detection thresholds
├─ detector/                 # Core detection engine
├─ scripts/                  # Recorders, scanner, enrichment, and upload helpers
├─ schema/                   # Event schema, Sigma rule, OpenSearch mappings
├─ captures/                 # Raw WAV segments (input)
├─ clips/                    # Alert clips (auto)
├─ specs/                    # Spectrogram PNGs (auto)
└─ events/events.jsonl       # JSONL event log (auto)
```

## Quickstart

1. Pick three reliable public SDRs (EU, ME, NA) and update `config/config.yaml`.
2. Start recorders, for example:
   ```bash
   ./scripts/record_kiwi.sh captures
   ```
3. Launch the detector:
   ```bash
   python3 detector/detector.py --config config/config.yaml
   ```
4. (Optional) Enable the wideband scanner:
   ```bash
   python3 scripts/scan_hf.py --config config/config.yaml \
     --capture-cmd "python3 -m kiwiclient.kiwirecorder -s kiwisdr.example.net -p 8073 -f {freq} -m usb -L 300 -H 3000 -T {dwell} -r -w -q 1 -o {out}"
   ```
5. (Optional) Enrich events with public numbers-station schedules:
   ```bash
   python3 scripts/enrich_numbers.py --config config/config.yaml
   ```
6. (Optional) Ship clips and metadata to cloud storage:
   ```bash
   python3 scripts/ship_objects.py
   ```

## Notes

- All monitoring is receive-only; do not transmit or interfere with RF systems.
- Populate `cache/` with polite scrapes of Priyom / SpyNumbers schedules for enrichment.
- Set `upload.enabled: true` and credentials via environment variables to activate shipping.
- Generated artifacts retain SHA-256 hashes for chain-of-custody validation.

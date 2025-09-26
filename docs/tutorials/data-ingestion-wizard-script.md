# Video Script: Data Ingestion Wizard Onboarding

**Goal:** Show new analysts how to import a CSV dataset into IntelGraph using the guided ingestion wizard and verify the pipeline kickoff.

**Audience:** First-time IntelGraph data engineers and analysts.

**Estimated runtime:** ~3 minutes.

**Recommended recording tools:** Loom (quick sharing) or OBS Studio (higher production control). Capture at 1080p with system audio enabled.

**Video placeholder:** https://loom.com/share/TBD-data-ingestion-wizard

## Scene Breakdown

| Timestamp | Visuals & Actions | Narration Script |
|-----------|-------------------|------------------|
| 00:00-00:20 | Title card with IntelGraph logo fades into the dashboard homepage. Cursor highlights the "Ingestion" module in the left nav. | "Welcome to IntelGraph! In this quick tour we'll use the Data Ingestion Wizard to bring a new dataset online in just a few clicks." |
| 00:20-00:50 | Hover over the navigation, click **Data Ingestion** → **Launch Wizard**. Wizard modal opens showing source selection. | "From the dashboard, open the Data Ingestion area and launch the guided wizard. The wizard walks you through source setup, schema mapping, and validation." |
| 00:50-01:20 | Select **CSV Upload**, click **Next**, drag in sample CSV, show preview pane auto-detecting columns. | "We'll ingest a CSV export of incident reports. Upload the file here and review the automatic schema detection. IntelGraph inspects headers and proposes data types." |
| 01:20-01:45 | Switch to mapping step, map `incident_id` to key, `timestamp` to datetime, `threat_level` to enum. | "Confirm or adjust the column mappings. I'll set incident_id as the primary key, timestamp as a datetime, and flag threat_level as an enum so downstream analytics recognize the scale." |
| 01:45-02:10 | Advance to validation step, show data quality checks (null counts, anomalies). Accept defaults. | "The wizard runs data quality checks automatically. Review null counts, anomaly alerts, and accepted thresholds. Everything looks good, so we'll accept the defaults." |
| 02:10-02:40 | Final confirmation screen. Click **Start Ingestion**. Switch to pipeline activity page showing job status progressing from queued → running → completed. | "Submit the job to kick off ingestion. The activity view tracks progress in real time, so you can monitor the pipeline from queued to complete without leaving the wizard." |
| 02:40-03:00 | Show success toast, navigate to data catalog entry, highlight sample records. End with outro card listing next steps. | "Once complete, the dataset is cataloged and ready for graph modeling. Explore the record preview, then continue to entity modeling or schedule recurring uploads. Thanks for onboarding!" |

## On-Screen Callouts

- Add lower-third text for each wizard step ("Select Source", "Map Schema", "Validate & Launch").
- Use zoom/pan to emphasize the schema mapping dropdown and validation metrics.
- Overlay keyboard shortcut tooltip when pressing `⌘+K`/`Ctrl+K` to search for existing ingestion jobs.

## Post-Production Notes

- Insert gentle background track at -18 LUFS; duck to -24 LUFS under narration.
- Export MP4 and upload to Loom or the Summit video library; replace the placeholder link above with the final share URL.
- Generate closed captions from the transcript file to ensure accessibility compliance.

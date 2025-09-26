# Transcript: Data Ingestion Wizard Onboarding

**Recording placeholder:** https://loom.com/share/TBD-data-ingestion-wizard

**Duration:** ~3 minutes

---

**00:00 – 00:10**  
"Welcome to IntelGraph! In this quick tour, I'll show you how to bring a fresh dataset into the platform using the Data Ingestion Wizard."

**00:10 – 00:25**  
"From the main dashboard, head to the Data Ingestion area and launch the guided wizard. It's designed to walk you through source setup, schema mapping, and validation."

**00:25 – 00:45**  
"We'll work with a CSV export of incident reports. Upload the file, then review the automatic schema detection. IntelGraph inspects the headers and suggests data types so you start with a clean baseline."

**00:45 – 01:05**  
"Next, confirm the column mappings. I'll set `incident_id` as the primary key, map the `timestamp` column to a datetime field, and treat `threat_level` as an enum to drive downstream analytics."

**01:05 – 01:25**  
"The wizard automatically runs data quality checks. Scan the null counts and anomaly alerts. Everything looks good here, so we'll keep the defaults and continue."

**01:25 – 01:50**  
"On the final screen, review your configuration and press Start Ingestion. The activity feed shows the pipeline moving from queued to running so you always know what's happening."

**01:50 – 02:20**  
"Once the job completes, the dataset is cataloged instantly. Jump into the record preview to spot-check a few rows, then continue to build out your graph model or schedule recurring uploads."

**02:20 – 03:00**  
"And that's it! In under three minutes we've onboarded a new dataset with validated schema and quality checks. You're ready to model entities, create relationships, and power new insights." 

---

*Use this transcript to generate captions or localized subtitles. Update timestamps after the final recording if pacing changes.*

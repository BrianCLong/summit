# Video Script: ML Integration Kickstart

**Goal:** Walk platform engineers through connecting an external ML model to IntelGraph, configuring feature streams, and validating inference output.

**Audience:** Machine learning engineers and solution architects onboarding to IntelGraph's ML workspace.

**Estimated runtime:** ~4 minutes.

**Recommended recording tools:** OBS Studio for scene switching between browser and terminal, or Loom with screen + camera for a faster capture.

**Video placeholder:** https://loom.com/share/TBD-ml-integration

## Scene Breakdown

| Timestamp | Visuals & Actions | Narration Script |
|-----------|-------------------|------------------|
| 00:00-00:20 | Intro slide "ML Integration Kickstart" with logos. Transition to IntelGraph ML Workspace overview page. | "In this tutorial we'll connect an external machine learning model to IntelGraph, wire up live features, and validate the inference results." |
| 00:20-00:55 | Click **ML Workspace → Integrations**. Show available connectors (SageMaker, Vertex AI, Custom REST). Select **Custom REST Endpoint**. | "Navigate to the ML Workspace and open Integrations. You can choose from managed providers like SageMaker or Vertex AI, or define a custom REST endpoint. We'll use a custom model hosted in our cloud." |
| 00:55-01:30 | Fill endpoint form: name "Threat Score API", base URL `https://ml.example.com/predict`, add auth header. | "Provide the model's metadata, the base URL for inference, and any authentication headers. IntelGraph stores credentials in the secure vault so your tokens never appear in logs." |
| 01:30-02:05 | Configure feature stream: select dataset "Incident Ingestion", choose features `incident_id`, `threat_level`, `geo_hash`, `vector_embedding`. Show preview rows. | "Next, attach a feature stream. We'll reuse the incident ingestion dataset, selecting identifiers, categorical inputs, and the generated vector embedding. Preview the payload to ensure the JSON matches your model contract." |
| 02:05-02:45 | Set output mapping: map response field `score` to `threat_score`, `explanations` to nested insights. Enable batching (size 50). | "Map the response fields back into IntelGraph. I'll route the numeric score into our threat_score attribute and capture explanations for analyst transparency. Enable batching to optimize throughput." |
| 02:45-03:20 | Run test inference with sample payload, show success badge and returned JSON. | "Run a live test to confirm connectivity. The response looks good and returns scores with explanations, so we're ready to deploy." |
| 03:20-03:50 | Deploy integration to staging, show monitoring dashboard with latency chart and error rate. | "Deploy to staging with a single click. The monitoring dashboard tracks latency, throughput, and error rates so you can validate model health before promoting to production." |
| 03:50-04:10 | Highlight downstream usage: show rule builder referencing `threat_score`, mention alert pipeline. Outro card. | "Now that the integration is live, analysts can incorporate the threat score into rules, alerts, and graph analytics. Thanks for integrating your model with IntelGraph." |

## On-Screen Callouts

- Use annotation to emphasize secure credential storage and feature preview payload.
- Show tooltip referencing docs/tutorials/advanced-pipeline-features.md for chaining ML outputs to pipelines.
- Include quick terminal popover demonstrating `curl` health check (optional B-roll).

## Post-Production Notes

- Cut to webcam for 5 seconds during intro to personalize the tutorial.
- Add lower-third text for each integration step to reinforce the workflow.
- Replace the Loom placeholder link once uploaded; ensure README references the finalized URL.

# Transcript: ML Integration Kickstart

**Recording placeholder:** https://loom.com/share/TBD-ml-integration

**Duration:** ~4 minutes

---

**00:00 – 00:18**  
"Welcome to the ML Integration Kickstart. In the next few minutes we'll connect an external inference endpoint to IntelGraph and make its scores available across the platform."

**00:18 – 00:40**  
"From the ML Workspace, open Integrations. IntelGraph supports managed providers such as SageMaker and Vertex AI, but today we're wiring up a custom REST endpoint for maximum flexibility."

**00:40 – 01:05**  
"I'll name this integration 'Threat Score API,' paste in the base URL, and add the bearer token header. Credentials are stored in the secure vault, so they never appear in logs or exports."

**01:05 – 01:32**  
"Next we attach a feature stream. I'm selecting the incident ingestion dataset and including the incident identifier, the analyst-assigned threat level, a geospatial hash, and the pre-computed vector embedding. The preview shows the JSON payload exactly as the model will receive it."

**01:32 – 01:58**  
"Now map the response. The model returns a numeric score and an explanations array. I'll store the score in our threat_score attribute and keep the explanations so analysts can see why the model responded the way it did. I'll also enable batching with a size of fifty to keep throughput high."

**01:58 – 02:30**  
"Time for a live test. IntelGraph sends a sample payload, and we get back a 200 response with the expected JSON. The green badge confirms that the endpoint is healthy."

**02:30 – 03:05**  
"Deploy the integration to staging. The monitoring dashboard starts collecting latency, throughput, and error metrics right away, so you can observe the model before promoting it to production."

**03:05 – 03:45**  
"With the integration live, analysts can use the threat_score in alert rules, pipelines, and even graph queries. It's a seamless way to blend ML insights into your investigative workflows."

**03:45 – 04:10**  
"Thanks for watching! Follow the linked documentation to automate retraining hooks or connect additional models when you're ready."

---

*Repurpose this transcript for captions, localized overdubs, or searchable knowledge base articles. Update timestamps after the final edit if pacing shifts.*

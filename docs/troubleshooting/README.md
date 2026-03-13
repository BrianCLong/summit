# Summit Troubleshooting Guide

This guide provides troubleshooting steps for the most common operational and development issues encountered in the Summit platform. If you're encountering an issue, look for the symptoms below.

## 1. Graph Query Returning Empty Results

**Symptoms:**

- Queries executed via GraphQL or directly against Neo4j return empty datasets when data is expected.
- Graph visualizations in the UI show empty nodes or missing relationships.
- API responses return `200 OK` but `data: []` or `data: null`.

**Diagnosis Steps:**

1.  Verify the query syntax and variables used in the query.
2.  Query the Neo4j database directly using the Cypher shell or Neo4j Browser to bypass the API layer.
3.  Check the API gateway and GraphRAG service logs for any silent errors during the query execution.
4.  Confirm that the expected data has actually been ingested and stored in the graph. Check the ingestion pipelines.

**Root Cause Analysis:**

- A discrepancy between the schema used by the query and the actual schema in the database (e.g., node labels or relationship types changed).
- Data was not ingested correctly due to mapping errors.
- The query includes restrictive filters or incorrect IDs that eliminate all results.
- Role-Based Access Control (RBAC) policies are silently filtering out nodes the user doesn't have permission to see.

**Fix/Workaround:**

- Correct the query syntax or filters to match the database schema and actual data.
- If data is missing, re-run the relevant ingestion pipeline.
- Adjust RBAC policies if the user is incorrectly restricted from viewing the data.
- Use `EXPLAIN` or `PROFILE` in Neo4j to understand how the query is being evaluated and identify missing paths.

**Prevention:**

- Implement schema validation during the ingestion process.
- Add integration tests that verify data retrieval after ingestion.
- Monitor query performance and empty result rates as an observability metric.

---

## 2. Ingestion Pipeline Stuck or Slow

**Symptoms:**

- Data from connectors (REST API, CSV, S3) is not appearing in the database.
- The Maestro Conductor dashboard shows jobs in a `pending` or `processing` state for an unusually long time.
- High CPU or Memory usage on Switchboard worker nodes.
- Lag in Kafka topics or Redis queues backing the ingestion pipeline.

**Diagnosis Steps:**

1.  Check the Switchboard and Maestro Conductor logs for errors, exceptions, or retry loops.
2.  Inspect the queue metrics (e.g., in Redis or Kafka) to see if messages are backing up.
3.  Look at the specific job payload that is stuck to identify if it's a "poison pill" (malformed data).
4.  Check for rate limiting or throttling from the external source API (if using a REST connector).
5.  Check database connection pool utilization to ensure the pipeline isn't waiting on available connections.

**Root Cause Analysis:**

- A "poison pill" message is causing the worker to crash or hang indefinitely during parsing or validation.
- External API rate limits have been hit, causing the connector to sleep or continuously retry.
- Database performance degradation (e.g., slow inserts or lock contention in Postgres/Neo4j) is creating backpressure.
- Insufficient worker resources (CPU/Memory) for the volume of data.

**Fix/Workaround:**

- Identify and remove/quarantine any poison pill messages from the queue.
- Temporarily scale up the number of Switchboard worker nodes.
- If rate limited, adjust the connector's polling frequency or implement exponential backoff.
- Restart stuck worker pods if they are unresponsive.
- Optimize database write performance (e.g., batching inserts, adjusting indexes).

**Prevention:**

- Implement strict payload validation and Dead Letter Queues (DLQs) for malformed messages.
- Configure timeouts for all external API calls and database operations.
- Set up alerts for queue depth and job processing duration.

---

## 3. LLM Response Timeouts

**Symptoms:**

- GraphRAG features, summarization, or agentic tasks fail with timeout errors (e.g., `504 Gateway Timeout` or application-level timeouts).
- Logs show `Request to LLM provider timed out` or similar messages.
- High latency in user-facing features relying on language models.

**Diagnosis Steps:**

1.  Identify which specific LLM provider and model is timing out (e.g., OpenAI, Anthropic, local model).
2.  Check the provider's status page for known outages or degraded performance.
3.  Examine the prompt size and context window being sent to the LLM. Extremely large prompts take longer to process.
4.  Review application-level timeout configurations (e.g., Axios timeouts, gateway timeouts).

**Root Cause Analysis:**

- The LLM provider is experiencing high load or an outage.
- The prompt sent to the model is too large, exceeding the model's processing capabilities within the expected timeframe.
- Application timeout settings are too aggressive for the complexity of the requested task.
- Network latency or connectivity issues between the Summit deployment and the LLM provider.

**Fix/Workaround:**

- If the provider is down, switch to a fallback provider if configured.
- Increase the application-level timeout settings temporarily.
- Optimize the prompt to reduce its size (e.g., by chunking data or improving retrieval precision).
- If using a local model, scale up the GPU resources.

**Prevention:**

- Implement circuit breakers and fallback mechanisms for LLM calls.
- Set appropriate timeouts that account for the expected latency of the specific model and task.
- Monitor token usage and LLM response times.
- Implement caching for frequent, deterministic LLM queries.

---

## 4. Entity Extraction Producing Low Quality Results

**Symptoms:**

- The knowledge graph contains duplicate entities (e.g., "Apple" and "Apple Inc.").
- Irrelevant or incorrect entities are extracted from documents.
- Relationships between entities are missing or incorrectly categorized.
- Low recall in downstream queries due to missed entities.

**Diagnosis Steps:**

1.  Review a sample of the source text and the corresponding extracted entities and relationships.
2.  Check the prompt template and parameters used for the extraction LLM call.
3.  Verify the specific LLM model being used; smaller models may struggle with complex extraction.
4.  Inspect the pre-processing steps (e.g., chunking strategy) to ensure context isn't being lost.

**Root Cause Analysis:**

- The prompt instructions for extraction are ambiguous or lack sufficient examples (few-shot prompting).
- The text chunking strategy is splitting sentences or paragraphs abruptly, causing loss of context for the extractor.
- The LLM model lacks the domain-specific knowledge required for accurate extraction.
- The entity resolution/deduplication logic (post-extraction) is failing.

**Fix/Workaround:**

- Refine the extraction prompts to be more specific and include clear constraints and examples.
- Adjust the chunk size and overlap parameters in the text splitter.
- Switch to a more capable LLM model for the extraction phase.
- Run a data cleanup script to merge duplicate entities in the graph database.

**Prevention:**

- Develop a robust entity resolution pipeline (e.g., using embedding similarity or fuzzy matching) to merge duplicates before inserting into the graph.
- Create a benchmark dataset for entity extraction and run evaluations whenever prompts or models are changed.
- Implement a "human-in-the-loop" review process for low-confidence extractions.

---

## 5. Vector Similarity Search Returning Irrelevant Results

**Symptoms:**

- Semantic search queries return documents or nodes that do not match the user's intent.
- GraphRAG context retrieval pulls in irrelevant information, leading to hallucinations or poor LLM answers.
- Similarity scores for known relevant documents are unexpectedly low.

**Diagnosis Steps:**

1.  Examine the exact query string used for the search.
2.  Check which embedding model was used to generate the vectors in the database (e.g., Qdrant) and ensure the same model is used to embed the query.
3.  Review the text chunks that correspond to the retrieved vectors.
4.  Run a test search using known relevant and irrelevant queries to check the similarity score thresholds.

**Root Cause Analysis:**

- Mismatch between the embedding model used for indexing and the one used for querying.
- The embedding model is not suited for the specific domain or language of the data.
- The text chunks being embedded are too small (lacking context) or too large (diluting specific meaning).
- The similarity threshold for retrieval is set too low, allowing noisy results to be returned.

**Fix/Workaround:**

- Ensure the same embedding model is used consistently across ingestion and querying.
- If the model is incorrect, the vector database must be re-indexed with the correct model.
- Adjust the similarity score threshold (e.g., increase the minimum score required to return a result).
- Tweak the chunking strategy to better capture semantic meaning.

**Prevention:**

- Store metadata about the embedding model used alongside the vectors.
- Regularly evaluate retrieval performance using the retrieval evaluation harness (`evals/retrieval/`).
- Consider fine-tuning an embedding model for specific domain vocabularies if necessary.

---

## 6. Authentication Failures

**Symptoms:**

- Users are unable to log into the UI or API.
- API requests return `401 Unauthorized` or `403 Forbidden` errors.
- Auth0 logs show failed login attempts or configuration errors.
- JWT validation errors in application logs.

**Diagnosis Steps:**

1.  Check the application logs for specific JWT validation errors (e.g., token expired, invalid signature, audience mismatch).
2.  Verify the Auth0 tenant configuration (Client ID, Domain, Audience).
3.  Inspect the JWT token being sent by the client using a tool like jwt.io (ensure it contains the necessary claims and hasn't expired).
4.  Check network connectivity between the Summit deployment and the Auth0 issuer URL.

**Root Cause Analysis:**

- Misconfiguration of Auth0 environment variables (e.g., incorrect `AUTH0_ISSUER_BASE_URL` or `AUTH0_AUDIENCE`).
- The client is sending an expired or malformed JWT token.
- Clock skew between the server validating the token and the Auth0 issuing server.
- The user's account has been disabled or they lack the required permissions (roles) assigned in Auth0.

**Fix/Workaround:**

- Correct any misconfigured environment variables and restart the API services.
- Force the client to re-authenticate and obtain a fresh JWT token.
- Ensure the server's NTP synchronization is working properly to resolve clock skew issues.
- Verify user roles and permissions in the Auth0 dashboard.

**Prevention:**

- Automate the rotation and management of Auth0 secrets.
- Implement clear error messages for the client when authentication fails (without leaking sensitive info).
- Set up alerts for unusual spikes in authentication failures.

---

## 7. High Memory Usage in Graph Traversal

**Symptoms:**

- Neo4j or the application API pod crashes with Out Of Memory (OOM) errors during complex queries.
- System monitoring shows sustained high memory utilization on database or API nodes.
- Significant performance degradation across the platform when specific graph queries are running.

**Diagnosis Steps:**

1.  Identify the specific query causing the high memory usage (use Neo4j query logs or APM tools).
2.  Run `EXPLAIN` on the problematic query in Neo4j to analyze the execution plan and identify unbounded path traversals or large intermediate result sets.
3.  Check the memory configuration of the Neo4j instance (page cache size, heap size).
4.  Examine the API layer to see if it's attempting to load massive amounts of data into memory at once.

**Root Cause Analysis:**

- Unbounded variable-length path queries (e.g., `MATCH p=(a)-[*]->(b)`) exploring too much of the graph.
- Queries returning massive Cartesian products due to missing relationship specifications.
- The Neo4j heap size is configured too low for the workload, or the page cache is stealing too much memory.
- The API layer is missing pagination, attempting to serialize millions of records at once.

**Fix/Workaround:**

- Rewrite queries to bound variable-length paths (e.g., `MATCH p=(a)-[*1..3]->(b)`).
- Add strict limits (`LIMIT`) and pagination to queries.
- Increase the memory limits for the Neo4j container/pod if necessary.
- Kill the offending query in Neo4j if it is currently hanging and consuming resources.

**Prevention:**

- Enforce query timeouts and memory limits within Neo4j configuration.
- Require pagination for all API endpoints that return lists of data.
- Review and optimize Cypher queries during the PR review process.

---

## 8. CI Pipeline Failures

**Symptoms:**

- GitHub Actions workflows fail consistently.
- Tests pass locally but fail in the CI environment.
- Docker build steps fail due to missing dependencies or context errors.
- The `jules-orchestration` or `validate-workflows` steps block the PR.

**Diagnosis Steps:**

1.  Review the specific failed step in the GitHub Actions output logs.
2.  Check for environment discrepancies between local development and CI (e.g., Node version, Python version, missing environment variables).
3.  If tests fail, identify if they are flaky (timing dependent) or deterministically failing.
4.  Check the `CI Workflow Drift Sentinel` output for governance violations.

**Root Cause Analysis:**

- A missing dependency in `package.json` or `requirements.txt` that is only present globally on the developer's machine.
- Tests are relying on external services that are not mocked or available in the CI runner.
- Docker multi-arch build issues (e.g., building `linux/amd64` and `linux/arm64` encounters a platform-specific bug).
- A violation of repository governance rules (e.g., unpinned GitHub Action versions, modifying archived workflows).

**Fix/Workaround:**

- Add the missing dependency and update lockfiles.
- Mock external API calls in tests or configure a test database instance in the CI workflow.
- Fix workflow governance issues (e.g., pin actions to specific SHA refs, ensure unique workflow names).
- Re-run the failed job if the failure was due to a transient network issue.

**Prevention:**

- Run tests locally inside a Docker container to simulate the CI environment.
- Regularly update and prune dependencies.
- Follow the strict guidelines for adding or modifying GitHub workflows (documented in `.github/`).

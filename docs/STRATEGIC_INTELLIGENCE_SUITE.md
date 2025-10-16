# Strategic Intelligence Suite Integration

This document outlines the setup and usage of the Strategic Intelligence Suite, which integrates advanced analytical modules into IntelGraph.

## Setup Instructions

1.  **Download Datasets:**
    Place the following datasets into the `python/data/` directory:
    - **MITRE ATT&CK:**
      ```bash
      wget https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json -O python/data/mitre_attack.json
      ```
    - **ACLED:**
      Download the CSV file from [https://acleddata.com/conflict-data/download-data-files](https://acleddata.com/conflict-data/download-data-files) (registration required) and place it in `python/data/acled.csv`.
    - **Wikidata:**
      Download a subset JSON from [https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2](https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2) (decompress the subset) and place it in `python/data/wikidata_subset.json`.

2.  **Build and Run Docker Containers:**
    Navigate to the root of your IntelGraph repository and run:

    ```bash
    docker-compose up -d --build
    ```

    This will build the new `ai-server` and other services, and start all containers in detached mode.

3.  **Access the Frontend:**
    Once the frontend service is running (typically on `http://localhost:5173` or similar, check your `client/package.json` for the `start` script), you should find a new tab or navigation link for "Strategic Intelligence Suite" (or similar, depending on frontend integration) where you can access the dashboards for each module.

4.  **Test with Sample Inputs (via GraphQL Playground):**
    You can test the new modules using the GraphQL Playground (usually accessible via your `api-service` endpoint, e.g., `http://localhost:8000/graphql`). Use the `Mutation` operations defined in `server/src/graphql/schema/strategicIntelligenceSchema.gql`.

    **Example GraphQL Mutation for Threat Correlation:**

    ```graphql
    mutation {
      correlateThreats(
        osintInput: {
          events: [
            {
              region: "Middle East"
              actor: "APT28"
              theme: "Cyber Espionage"
              event_id: "event-123"
              timestamp: "2025-01-15T10:00:00Z"
            }
            {
              region: "Eastern Europe"
              actor: "Fancy Bear"
              theme: "Disinformation"
              event_id: "event-124"
              timestamp: "2025-01-16T11:30:00Z"
            }
          ]
        }
      ) {
        prioritized_map
        confidence
        note
      }
    }
    ```

    Adjust inputs for `optimizeWargame`, `analyzeSentimentVolatility`, and `analyzeStego` mutations as per their expected JSON structures.

## Ethical Compliance Notes

All outputs from the Strategic Intelligence Suite modules are watermarked and flagged as hypothetical simulations for testing and defensive analysis purposes only. They are not intended for real-world operational use without further validation and ethical review.

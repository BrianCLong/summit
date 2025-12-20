# Entity Resolution System

The Entity Resolution System (ERS) identifies and merges duplicate entities in the IntelGraph platform. It uses fuzzy matching and a configurable scoring model to resolve conflicts and record provenance.

## Architecture

- **Engine**: Core logic for resolution (`EntityResolver.ts`), fuzzy matching (`FuzzyMatcher.ts`), and conflict resolution (`ConflictResolver.ts`).
- **Models**: Scoring models (`SimilarityModel.ts`) and feature extraction (`FeatureExtractor.ts`).
- **Utils**: String normalization and phonetic algorithms.

## Usage

### API Endpoints

- `POST /api/er/find-duplicates`: Find duplicates for a given entity ID.
  ```json
  { "entityId": "123", "threshold": 0.8 }
  ```

- `POST /api/er/recommend-merge`: Get a score and recommendation for two entities.
  ```json
  { "entityIds": ["id1", "id2"] }
  ```

- `POST /api/er/merge`: Execute a merge operation.
  ```json
  { "entityIds": ["primaryId", "secondaryId"], "strategies": ["recency"], "dryRun": false }
  ```

## Algorithm & Tuning

The system uses a `WeightedRuleBasedModel` by default.

### Weights (Default)
- `name_jaro_winkler`: 0.2
- `name_soundex_match`: 0.1
- `address_cosine`: 0.2
- `phone_match`: 0.25
- `email_match`: 0.25

### Thresholds
- `auto_merge`: > 0.9
- `review`: > 0.7

To tune the model, modify `server/src/entity-resolution/models/SimilarityModel.ts` or subclass `SimilarityModel` and inject it into `MLScorer`.

### Low Information Penalty
If the total weight of available features (e.g., only Name is present) is less than 0.5, the score is penalized to prevent high confidence matches on weak evidence.

## Adding Custom Matchers

1. Implement a new matcher in `server/src/entity-resolution/engine/` or `utils/`.
2. Update `FeatureExtractor.ts` to use the new matcher and return the feature.
3. Update `SimilarityModel.ts` to assign a weight to the new feature.

## Troubleshooting

- **Low Match Scores**: Check if entities have normalized data (e.g. phone numbers). Ensure critical fields like Phone or Email are present.
- **False Positives**: Increase weights for unique identifiers (Phone, Email) and decrease Name weights.

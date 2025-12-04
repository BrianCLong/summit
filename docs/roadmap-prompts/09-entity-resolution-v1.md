# Prompt #9: Entity Resolution v1 - Explainable Merges + APIs

**Target**: Core GA Q3 2025
**Owner**: Data quality team
**Depends on**: Graph database, ML features, Human-in-the-loop UI

---

## Pre-Flight Checklist

```bash
# ✅ Check existing ER code
find . -name "*entity*resolution*" -o -name "*er-*" -o -name "*dedup*" | head -10

# ✅ Verify graph database
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "MATCH (n) RETURN count(n) LIMIT 1"

# ✅ Check ML infrastructure
which python3
pip list | grep -E "scikit-learn|pandas"
```

---

## Claude Prompt

```
You are implementing Entity Resolution (ER) v1 for IntelGraph - explainable deduplication with human-in-the-loop.

CONTEXT:
- Stack: Python (FastAPI + scikit-learn) OR Node.js + ML.js
- Graph: Neo4j for entity storage
- Frontend: apps/web/src/components/
- Use case: Merge duplicate persons, organizations, locations

REQUIREMENTS:
Build entity resolution system with:

1. **Matching Signals (No Biometric ID)**:
   Allowed signals:
   - ✅ Name/alias matching (exact, fuzzy, phonetic)
   - ✅ Geospatial co-occurrence (same location, same time)
   - ✅ Temporal co-occurrence (events within same timeframe)
   - ✅ Device/browser fingerprints (IP, user-agent)
   - ✅ Crypto addresses (Bitcoin, Ethereum wallets)
   - ✅ Perceptual hashes (image similarity: pHash, dHash)
   - ✅ Email, phone, SSN (if available and legal)

   Prohibited:
   - ❌ Facial recognition
   - ❌ Voice biometrics
   - ❌ Iris/fingerprint scans
   - ❌ Any other biometric identifiers

2. **ER Pipeline**:
   - Step 1: Blocking (reduce candidate pairs)
     - Block by: First 3 chars of name, zip code, domain
   - Step 2: Pairwise scoring
     - Signals → Features → Score (0-1)
     - Example: Jaro-Winkler(name1, name2), Levenshtein(email1, email2)
   - Step 3: Clustering
     - Connected components or hierarchical clustering
   - Step 4: Review queue
     - High confidence (>0.9): Auto-merge
     - Medium (0.5-0.9): Human review
     - Low (<0.5): Skip

3. **APIs**:
   - POST /er/candidates - Find potential duplicates
   - POST /er/merge - Merge entities (with reason)
   - POST /er/split - Undo merge (reversible)
   - GET /er/explain/{entityId} - Show merge history and features

4. **Explainability**:
   - For each merge: Store {features[], scores[], decision, confidence, overrides[]}
   - Example: "Merged because: name=0.95, email=1.0, geo=0.80, human_override=true"
   - UI: apps/web/src/components/er/ERExplainPanel.tsx
   - Show: Feature contribution (bar chart), override reason (text)

5. **Human-in-the-Loop Reconcile Queue**:
   - apps/web/src/components/er/ERQueue.tsx
   - Display: Candidate pairs with scores
   - Actions: Merge, Skip, Not a Match, Need More Info
   - Side-by-side view: Entity A | Entity B
   - Highlight: Matching fields (green), conflicting fields (red)

6. **Reversible Merges**:
   - Store: Original entities before merge (soft delete)
   - Merge creates: New merged entity + provenance graph
   - Graph: (Entity A)-[:MERGED_INTO]->(Merged Entity)
   - Split: Restore original entities, delete merged entity
   - Audit: Log all merges/splits with user, reason, timestamp

7. **Confidence Decay**:
   - Auto-merged entities: Re-score periodically (e.g., monthly)
   - If confidence drops below threshold: Flag for review
   - Reason: New data may contradict original merge
   - Example: Entity A+B merged on email, later email changes

8. **Golden Dataset for Testing**:
   - Create: tests/golden/er-dataset.json
   - 100 entity pairs: 50 true matches, 50 non-matches
   - Metrics: Precision, recall, F1 score
   - Target: F1 ≥ 0.95 on golden dataset

DELIVERABLES:

1. services/er/
   - Framework: FastAPI (Python) OR Express (Node.js)
   - Dockerfile, requirements.txt (or package.json)

2. services/er/src/routes/candidates.py (or .ts)
   - POST /er/candidates
   - Payload: {entityType, blockingKey (optional)}
   - Returns: {pairs[], scores[]}

3. services/er/src/routes/merge.py (or .ts)
   - POST /er/merge
   - Payload: {entityIds[], reason, override (bool)}
   - Creates: Merged entity + provenance

4. services/er/src/routes/split.py (or .ts)
   - POST /er/split
   - Payload: {mergedEntityId, reason}
   - Restores: Original entities

5. services/er/src/routes/explain.py (or .ts)
   - GET /er/explain/{entityId}
   - Returns: {mergeHistory[], features[], overrides[]}

6. services/er/src/features/name-matcher.py (or .ts)
   - export class NameMatcher
   - Methods: exactMatch(), fuzzyMatch(), phoneticMatch()
   - Use: Jaro-Winkler, Levenshtein, Soundex/Metaphone

7. services/er/src/features/geo-matcher.py (or .ts)
   - export class GeoMatcher
   - Methods: haversineDistance(), coOccurrence()
   - Use: Check if entities in same location + time window

8. services/er/src/features/device-matcher.py (or .ts)
   - export class DeviceMatcher
   - Methods: ipMatch(), userAgentSimilarity()

9. services/er/src/features/crypto-matcher.py (or .ts)
   - export class CryptoMatcher
   - Methods: walletMatch(address1, address2)
   - Support: Bitcoin, Ethereum addresses

10. services/er/src/features/perceptual-hash.py (or .ts)
    - export class PerceptualHashMatcher
    - Methods: pHash(), dHash(), hammingDistance()
    - Use: imagehash (Python) or blockhash (Node.js)

11. services/er/src/scoring/scorer.py (or .ts)
    - export class ERScorer
    - Methods: score(entity1, entity2), combineFeatures(scores)
    - Combine: Weighted average or logistic regression

12. apps/web/src/components/er/ERQueue.tsx
    - UI: Table of candidate pairs
    - Columns: Entity A | Entity B | Score | Actions
    - Actions: Merge, Skip, Not a Match
    - Side-by-side: Show all fields, highlight matches

13. apps/web/src/components/er/ERExplainPanel.tsx
    - Bar chart: Feature contributions
    - Table: Merge history (who, when, why)
    - Button: "Undo merge" (split)

14. libs/er-features/ (shared library)
    - Reusable feature extractors
    - Export: NameMatcher, GeoMatcher, DeviceMatcher, etc.

15. Tests:
    - services/er/tests/test_candidates.py (or .test.ts)
    - services/er/tests/test_merge.py
    - services/er/tests/golden/test_f1_score.py
    - Golden dataset: 100 pairs, verify F1 ≥ 0.95

ACCEPTANCE CRITERIA:
✅ F1 score ≥ 0.95 on golden dataset (50 matches, 50 non-matches)
✅ Explainability: Show feature scores for every merge
✅ Reversible: Split restores original entities
✅ Human-in-the-loop: Review queue shows medium-confidence pairs
✅ Reproducible: Same features → Same score (deterministic)

TECHNICAL CONSTRAINTS:
- No biometric IDs: Face, voice, iris, fingerprint (hard constraint)
- Phonetic matching: Use Soundex, Metaphone, or DoubleMetaphone
- Fuzzy matching: Jaro-Winkler, Levenshtein (distance <3)
- Geo co-occurrence: Haversine distance <100m within same hour
- Crypto: Validate address format before matching
- Perceptual hash: Hamming distance <10 for match

SAMPLE CANDIDATE API RESPONSE:
```json
{
  "candidates": [
    {
      "pair": ["entity-1", "entity-2"],
      "score": 0.87,
      "features": {
        "nameMatch": 0.92,
        "emailMatch": 1.0,
        "geoCoOccurrence": 0.65,
        "deviceMatch": 0.80
      },
      "recommendation": "review"
    },
    {
      "pair": ["entity-3", "entity-4"],
      "score": 0.95,
      "features": {
        "nameMatch": 0.98,
        "phoneMatch": 1.0,
        "cryptoWalletMatch": 0.90
      },
      "recommendation": "auto_merge"
    }
  ]
}
```

SAMPLE MERGE API PAYLOAD:
```json
{
  "entityIds": ["entity-1", "entity-2"],
  "reason": "Same name, email, and geo co-occurrence",
  "override": false,
  "userId": "analyst-123"
}
```

SAMPLE EXPLAIN API RESPONSE:
```json
{
  "entityId": "merged-entity-5",
  "mergeHistory": [
    {
      "timestamp": "2025-11-29T10:00:00Z",
      "mergedFrom": ["entity-1", "entity-2"],
      "userId": "analyst-123",
      "reason": "Same name, email, and geo co-occurrence",
      "features": {
        "nameMatch": 0.92,
        "emailMatch": 1.0,
        "geoCoOccurrence": 0.65
      },
      "confidence": 0.87,
      "override": false
    }
  ],
  "currentStatus": "merged",
  "canSplit": true
}
```

SAMPLE NAME MATCHER (Python):
```python
from jellyfish import jaro_winkler_similarity, soundex

class NameMatcher:
    def exact_match(self, name1: str, name2: str) -> float:
        return 1.0 if name1.lower() == name2.lower() else 0.0

    def fuzzy_match(self, name1: str, name2: str) -> float:
        return jaro_winkler_similarity(name1, name2)

    def phonetic_match(self, name1: str, name2: str) -> float:
        return 1.0 if soundex(name1) == soundex(name2) else 0.0

    def score(self, name1: str, name2: str) -> float:
        exact = self.exact_match(name1, name2)
        if exact == 1.0:
            return 1.0
        fuzzy = self.fuzzy_match(name1, name2)
        phonetic = self.phonetic_match(name1, name2)
        return max(fuzzy, phonetic * 0.8)
```

SAMPLE PERCEPTUAL HASH (Python):
```python
from imagehash import phash
from PIL import Image

class PerceptualHashMatcher:
    def compute_hash(self, image_path: str) -> str:
        img = Image.open(image_path)
        return str(phash(img))

    def hamming_distance(self, hash1: str, hash2: str) -> int:
        return sum(c1 != c2 for c1, c2 in zip(hash1, hash2))

    def match(self, image1: str, image2: str, threshold: int = 10) -> bool:
        hash1 = self.compute_hash(image1)
        hash2 = self.compute_hash(image2)
        distance = self.hamming_distance(hash1, hash2)
        return distance < threshold
```

OUTPUT:
Provide:
(a) ER service with APIs (FastAPI or Express)
(b) Feature matchers (name, geo, device, crypto, perceptual hash)
(c) Scoring engine (weighted combination)
(d) React components (ERQueue, ERExplainPanel)
(e) Golden dataset (100 entity pairs)
(f) Tests (F1 score ≥ 0.95)
(g) API documentation (OpenAPI/Swagger)
(h) User guide (how to use ER queue)
```

---

## Success Metrics

- [ ] F1 score ≥ 0.95 on golden dataset
- [ ] Explainability: 100% of merges have feature scores
- [ ] Reversibility: 100% of merges can be split
- [ ] Human review queue shows medium-confidence pairs
- [ ] No biometric IDs used (audit code for compliance)

---

## Follow-Up Prompts

1. **ML-based scoring**: Train logistic regression or XGBoost on labeled data
2. **Active learning**: Ask user to label uncertain pairs, retrain model
3. **Cross-entity-type matching**: Merge person + organization (e.g., sole proprietor)

---

## References

- Phonetic matching: https://pypi.org/project/jellyfish/
- Perceptual hashing: https://pypi.org/project/ImageHash/
- Entity resolution theory: https://cs.stanford.edu/people/chrismre/papers/jellyfish.pdf

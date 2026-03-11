1. **Define the Domain Models (`packages/narrative-engine/src/core/types.ts`)**:
   - Add `NarrativeRiskFactors` type:
     ```typescript
     export interface NarrativeRiskFactors {
       viralityVelocity: number;
       adversarialAmplificationRatio: number;
       factualAccuracyDelta: number;
       emotionalManipulationIndex: number;
     }
     ```
   - Add `NarrativeRiskScore` type:
     ```typescript
     export interface NarrativeRiskScore {
       clusterId: string;
       overallRisk: number; // 0-100
       factors: NarrativeRiskFactors;
       timestamp: number;
     }
     ```

2. **Implement `NarrativeRiskScorer` (`packages/narrative-engine/src/core/NarrativeRiskScorer.ts`)**:
   - Create a class `NarrativeRiskScorer` with a method `computeRiskScore(clusterId: string, factors: NarrativeRiskFactors): NarrativeRiskScore`.
   - The overall risk should be a composite score. A simple weighted average would work (e.g., 30% virality, 30% adversarial, 20% factual delta, 20% emotional). We will ensure the inputs are scaled properly (assuming 0-1 or 0-100, we'll document expectations, probably normalizing to 0-100 internally).
   - Add method `batchScore(clusters: {clusterId: string, factors: NarrativeRiskFactors}[]): NarrativeRiskScore[]`.

3. **Update API router (`packages/narrative-engine/src/api/routes.ts`)**:
   - Add a new route `POST /api/narrative/score` that accepts an array of clusters with their factors and returns the computed scores.

4. **Write Unit Tests (`packages/narrative-engine/tests/NarrativeRiskScorer.test.ts`)**:
   - Test `computeRiskScore` with different inputs to ensure the composite calculation is correct and bounded between 0-100.
   - Test `batchScore`.
   - Test the new API endpoint `/api/narrative/score` in `integration.test.ts` or a new test.

5. **Export from `index.ts`**.

6. **Pre-commit and run checks**.

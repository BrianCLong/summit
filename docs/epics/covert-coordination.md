# Epic: Covert Coordination and Laundering Detection

## Objective
The goal of this epic is to extend the Summit platform's capabilities to detect hidden coordination between actors and trace the laundering of narratives from covert origins to mainstream discourse. This moves beyond simple reach and volume metrics to identify the *structural* and *tactical* behaviors of adversarial campaigns.

## Capabilities

### 1. Laundering Pipeline Detection
**Problem**: Adversaries plant narratives in fringe communities and "wash" them through semi-legitimate intermediaries before they reach mainstream platforms, obscuring the original source.
**Solution**:
- **Model**: Trace pathways using `LaunderingStage` nodes.
- **Analysis**: Graph algorithms to detect "hop" patterns characteristic of laundering (e.g., Fringe -> Anon Blog -> Alt-News -> Mainstream).
- **Metric**: `Laundering Depth` (number of hops from origin) and `Source Obfuscation Score`.

### 2. Steganographic & Format Coordination
**Problem**: Coordination often happens via non-obvious signals (e.g., synchronized meme templates, specific watermarks, reuse of image-text hybrids).
**Solution**:
- **Model**: `NarrativeArtifact` nodes to represent specific content pieces (images, text snippets).
- **Analysis**: Hashing and similarity matching (e.g., pHash for images) to link seemingly distinct posts.
- **Metric**: `Artifact Reuse Rate` and `Coordination Confidence`.

## Schema Extensions

### New Nodes
- **`NarrativeArtifact`**: Represents a specific content unit (image, video, meme template, text phrase).
  - `artifact_id`: Unique ID.
  - `type`: "IMAGE", "TEXT_SNIPPET", "VIDEO_CLIP".
  - `content_hash`: Perceptual hash or text embedding signature.
  - `stego_features`: JSON map of detected steganographic markers.

- **`CoordinationPattern`**: Represents a detected event of synchronized behavior.
  - `pattern_id`: Unique ID.
  - `type`: "TIME_SYNC", "CONTENT_REUSE", "CROSS_PLATFORM_CASCADE".
  - `confidence`: Float (0.0 - 1.0).
  - `detected_at`: Timestamp.

- **`LaunderingStage`**: Represents a phase in the narrative lifecycle.
  - `stage_id`: Unique ID.
  - `name`: "SEEDING", "AMPLIFICATION", "LEGITIMIZATION", "MAINSTREAMING".
  - `description`: Contextual description.

### New Relationships
- `(:Record)-[:CONTAINS_ARTIFACT]->(:NarrativeArtifact)`: Links a social post to its content artifacts.
- `(:NarrativeArtifact)-[:SIMILAR_TO {score: float}]->(:NarrativeArtifact)`: Links related artifacts (e.g., meme variations).
- `(:Entity)-[:SUSPECTED_PARTICIPANT]->(:CoordinationPattern)`: Links actors to a coordination event.
- `(:CoordinationPattern)-[:UTILIZED]->(:NarrativeArtifact)`: Links coordination to the content used.
- `(:Record)-[:BELONGS_TO_STAGE]->(:LaunderingStage)`: Tags a post with its laundering phase.
- `(:LaunderingStage)-[:NEXT_STAGE]->(:LaunderingStage)`: Defines the flow of the pipeline.

## GraphQL API Extensions

### Queries
```graphql
type Query {
  """
  Find paths that resemble narrative laundering from a suspect entity to a target entity.
  """
  findLaunderingPaths(
    sourceEntityId: ID!
    targetEntityId: ID!
    maxHops: Int = 5
  ): [LaunderingPath]

  """
  Detect coordination patterns within a given time window.
  """
  detectCoordination(
    startTime: DateTime!
    endTime: DateTime!
    minConfidence: Float = 0.8
  ): [CoordinationPattern]
}
```

## Copilot Flows

### Flow 1: Tracing Origins
**User**: "Copilot, where did this 'Save the hamsters' narrative originate?"
**Copilot**:
1. Identifies the `NarrativeArtifact` associated with the query.
2. Traverses `<-[:CONTAINS_ARTIFACT]-` and `<-[:HAS_RECORD]-` relationships backwards in time.
3. Identifies the earliest `LaunderingStage` (e.g., "SEEDING") and the `Entity` responsible.
4. **Response**: "This narrative first appeared on [Fringe Forum] 3 days ago, posted by UserX. It was then amplified by [Alt-News Site] before reaching Twitter today. This matches a known 'Seeding -> Amplification' laundering pattern."

### Flow 2: Detecting Coordinated Behavior
**User**: "Are there any coordinated bot networks pushing this hashtag?"
**Copilot**:
1. Queries `detectCoordination` for the timeframe.
2. Filters for patterns involving the specific hashtag or related `NarrativeArtifacts`.
3. **Response**: "Yes, I detected a 'TIME_SYNC' pattern with 95% confidence. 50 accounts posted the same image artifact within 2 minutes of each other. Here is the list of suspected participants."

## Success Metrics
- **Detection Latency**: Time from the start of a coordination event to its detection. Target: < 10 minutes.
- **Attribution Accuracy**: Percentage of detected patterns correctly attributed to a known actor/campaign. Target: > 85%.
- **Laundering Identification Rate**: Percentage of mainstream viral narratives for which a "pre-mainstream" origin can be identified. Target: Increase by 20%.

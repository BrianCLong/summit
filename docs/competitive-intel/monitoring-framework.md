# Competitive Intelligence Monitoring Framework

## Objective
To maintain a real-time understanding of the competitive landscape (Palantir, Recorded Future, Primer.ai) to inform product roadmap and sales positioning.

## Monitoring Channels

### 1. Patent Watch (Quarterly)
*   **Action**: Search USPTO/Google Patents for new filings by key competitors.
*   **Keywords**: "Graph RAG", "Agent Orchestration", "Intelligence Analysis AI".
*   **Owner**: Legal / CTO.
*   **Output**: Update `docs/patents/prior-art-analysis.md`.

### 2. Product Release Tracking (Monthly)
*   **Action**: Monitor competitor changelogs, blog posts, and webinar announcements.
*   **Focus**:
    *   Palantir AIP (Artificial Intelligence Platform) updates.
    *   Recorded Future "AI Insights" features.
*   **Owner**: Product Marketing.
*   **Output**: "Competitor Flash" email to Sales/Execs.

### 3. Win/Loss Analysis (Ongoing)
*   **Action**: Interview prospects after every closed deal (Won or Lost).
*   **Questions**:
    *   "What feature did the competitor have that we lacked?"
    *   "Why did you choose Summit over X?"
*   **Owner**: Sales Ops.
*   **Output**: Update `docs/narrative/competitive-positioning.md` Battlecards.

### 4. Technical Teardowns (Ad-Hoc)
*   **Action**: deeply analyze competitor SDKs, API docs, or open-source releases.
*   **Owner**: Engineering Lead.
*   **Output**: Update `docs/narrative/technology-differentiators.md`.

## Competitor List (Tier 1)
1.  **Palantir**: The incumbent. Focus on "Ease of Deployment" and "Openness" as our wedges.
2.  **Recorded Future**: The data giant. Focus on "Actionability" and "Reasoning" vs. just "Feeds."
3.  **Primer.ai**: The NLP specialist. Focus on our "Graph" integration as the differentiator.
4.  **Anduril (Lattice)**: Hardware/Defense focus. Watch for their software expansion.

## Reporting
*   **Frequency**: Monthly "State of the Market" brief in the All-Hands meeting.
*   **Repository**: Store reports in `docs/competitive-intel/reports/`.

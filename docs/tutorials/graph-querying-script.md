# Video Script: Graph Querying Essentials

**Goal:** Demonstrate how analysts can explore graph data using the IntelGraph query console, execute template queries, and build custom Cypher statements.

**Audience:** Intelligence analysts and data scientists onboarding to graph analytics.

**Estimated runtime:** ~3 minutes.

**Recommended recording tools:** Loom for rapid walkthroughs or OBS Studio for multi-scene edits. Record browser window plus optional webcam overlay.

**Video placeholder:** https://loom.com/share/TBD-graph-querying

## Scene Breakdown

| Timestamp | Visuals & Actions | Narration Script |
|-----------|-------------------|------------------|
| 00:00-00:15 | Opening slide with "Graph Querying Essentials" title. Transition to IntelGraph workspace showing graph overview widget. | "Welcome back! In this session we'll get comfortable querying the IntelGraph knowledge graph using the built-in console." |
| 00:15-00:40 | Navigate to **Analytics → Graph Console**. Show tabs for Templates and Custom Query. | "Open the Analytics section and launch the Graph Console. You'll see curated templates for common questions alongside a full Cypher editor." |
| 00:40-01:05 | Select template "Find Related Threat Actors". Preview auto-generated Cypher, run query, show graph visualization and table results. | "Start with a template. Here I'm investigating related threat actors. The template preloads a Cypher query so you can run it instantly and inspect both graph and tabular results." |
| 01:05-01:35 | Switch to Custom Query tab. Type `MATCH (a:Actor {name: $name})-[:ASSOCIATED_WITH]->(c:Campaign) RETURN a, c LIMIT 15;`. Use parameter panel to set `$name` to "Aurora Cell". | "To go deeper, hop into the custom tab. Draft Cypher or paste from your notebook, then set parameters without editing the query text. I'll search for campaigns linked to the Aurora Cell actor." |
| 01:35-02:05 | Run query, highlight parameter badge, filter results in visualization (hide low confidence edges). | "Execute the query and refine the visualization. Filter by confidence, expand neighbors, and pin important nodes to build a reusable insight canvas." |
| 02:05-02:35 | Save query as "Aurora Campaign Pivot", add description, toggle "Share with team". | "Save the query with a descriptive name and share it with your team so everyone starts from a vetted analytic pattern." |
| 02:35-03:00 | Export results (CSV/PNG). Show closing slide with key takeaways and link to advanced docs. | "When you're ready to brief stakeholders, export the table to CSV or snapshot the graph. That's the core workflow for graph querying in IntelGraph." |

## On-Screen Callouts

- Highlight the Template Library icon and the "Run" button.
- Use cursor emphasis to show the parameter sidebar appearing when using `$name`.
- Display keyboard overlay when pressing `Shift+Enter` to execute queries.

## Post-Production Notes

- Insert quick zoom on the graph visualization to emphasize community clusters.
- Add lower-third prompt: "Tip: Save queries to collaborate" at 02:05.
- Replace the placeholder Loom URL once the final recording is uploaded and add it to the README embedding list.

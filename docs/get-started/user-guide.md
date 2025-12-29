---
title: User Guide: The Analyst's Handbook
summary: Non-technical guide to using the Summit platform for intelligence analysis.
version: v2.0.0
lastUpdated: 2025-12-29
---

# User Guide: The Analyst's Handbook

Welcome to Summit! This guide is designed for intelligence analysts using the platform to conduct investigations.

## 1. The Core Workflow

### The Investigation Container

Everything in Summit happens inside an **Investigation**. Think of this as your digital case file. It contains:

- **Entities**: The people, places, and things involved.
- **Relationships**: How they are connected.
- **Evidence**: Documents, images, and notes backing up your findings.

### The Graph View

The primary way to view your case is the **Network Graph**.

- **Nodes (Circles)**: Represent Entities.
- **Edges (Lines)**: Represent Relationships.
- **Layouts**: Use the toolbar to arrange the graph (e.g., "Force Directed" to see clusters, "Hierarchical" to see command structures).

## 2. Using the AI Copilot

The Copilot is your AI research assistant. It lives in the side panel.

### What can it do?

- **Answer Questions**: "Who is the central figure in this network?"
- **Summarize**: "Summarize the 'Acme Corp' entity based on available evidence."
- **Suggest Connections**: "Are there any likely missing links between Group A and Group B?"

### Best Practices

- **Be Specific**: "Show me connections _confirmed by reliable sources_" is better than "Show me connections".
- **Verify**: The Copilot provides citations. Always check the source document.

## 3. Timeline & Maps

### Temporal Analysis

Switch to the **Timeline View** to see events in chronological order.

- **Filter**: Use the time slider to focus on a specific week or month.
- **Pattern Detection**: Look for spikes in activity (e.g., many meetings before a major event).

### Geospatial Analysis

Switch to the **Map View** to see entities with location data.

- **Heatmaps**: Identify hotspots of activity.
- **Movement**: Trace the path of an entity over time.

## 4. Collaboration

- **Real-time**: You can see your teammates' cursors and updates live on the graph.
- **Comments**: Right-click any node to leave a comment or question for your team.
- **Snapshots**: Save a "Snapshot" of the graph state to preserve a key finding for your report.

## 5. Exporting Reports

When your analysis is complete, you can generate a report.

1.  Go to the **Reports** tab.
2.  Select a template (e.g., "Intelligence Briefing", "Evidence Summary").
3.  Drag and drop Snapshots, Entities, and AI Summaries into the report builder.
4.  Export as PDF or HTML.

---
title: Tutorial: Your First Investigation
summary: Step-by-step guide to creating an investigation and using the Copilot.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Tutorial: Your First Investigation

This tutorial guides you through the core "Golden Path" workflow: creating an investigation, adding data, and using AI assistance.

**Prerequisites**:

- Local stack running (`make up`).
- Browser open to `http://localhost:3000`.

## Step 1: Create an Investigation

1.  Navigate to the **Dashboard**.
2.  Click the **"New Investigation"** button.
3.  Enter a name: `Tutorial: Unknown Signal`.
4.  Click **Create**. You will be redirected to the Graph View.

## Step 2: Manual Entity Creation

1.  Right-click on the canvas background.
2.  Select **"Add Entity"**.
3.  Choose Type: `Person`.
4.  Name: `John Doe`.
5.  Click **Save**.
6.  Repeat to create an `Organization` named `Acme Corp`.

## Step 3: Creating Relationships

1.  Hold `Shift` and drag a line from `John Doe` to `Acme Corp`.
2.  In the dialog, select Relationship Type: `WORKS_FOR`.
3.  Click **Save**.
4.  _Observation_: The graph now visually connects the two nodes.

## Step 4: Using the AI Copilot

1.  Open the **Copilot** panel (usually on the right).
2.  Type a prompt: _"Based on the graph, what acts as the bridge?"_
3.  The Copilot will analyze the current graph structure (2 nodes, 1 edge) and respond (e.g., _"The relationship WORKS_FOR bridges John Doe and Acme Corp..."_).

## Step 5: Running a Simulation (Advanced)

1.  Switch to the **Timeline/Sim** tab.
2.  Click **"Initialize Simulation"**.
3.  Click **"Step"** to advance time.
4.  Observe how parameters like "Risk" or "Influence" might change based on the defined rules (if any are active).

## Conclusion

You have successfully:

1.  Created a case container.
2.  Populated it with structured graph data.
3.  Interacted with the AI assistant.

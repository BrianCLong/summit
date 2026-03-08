#!/usr/bin/env node
/**
 * PR Dependency Graph Visualizer
 * 
 * Purpose:
 * - Generate a DOT graph of PR relationships (clusters, stacks, dependencies)
 * - Render as SVG if Graphviz is available
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

async function run() {
    const reportPath = "artifacts/supersedence-report.json";

    try {
        const { clusters } = JSON.parse(await fs.readFile(reportPath, "utf8"));

        let dot = "digraph PRGraph {\n";
        dot += "  rankdir=LR;\n";
        dot += "  node [shape=box, style=filled, fontname=\"Arial\"];\n";

        // Process clusters
        for (const cluster of clusters) {
            const survivor = cluster.survivor;
            dot += `  PR${survivor} [label="Survivor: #${survivor}", fillcolor=palegreen];\n`;

            for (const loser of cluster.losers) {
                dot += `  PR${loser.pr} [label="Obsolete: #${loser.pr}", fillcolor=lightpink];\n`;
                dot += `  PR${loser.pr} -> PR${survivor} [label="superseded", color=red];\n`;
            }
        }

        dot += "}\n";

        await fs.writeFile("artifacts/pr-graph.dot", dot);
        console.log("DOT graph generated: artifacts/pr-graph.dot");

        try {
            execSync("dot -V"); // Check if Graphviz is installed
            execSync("dot -Tsvg artifacts/pr-graph.dot -o artifacts/pr-graph.svg");
            console.log("SVG graph rendered: artifacts/pr-graph.svg");
        } catch (e) {
            console.log("Graphviz not found. Only DOT file generated.");
        }

    } catch (error) {
        console.error("Error generating graph:", error.message);
    }
}

run().catch(console.error);

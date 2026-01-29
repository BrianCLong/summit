import fs from "node:fs/promises";
import { canonicalHash } from "../util/hash.js";

export async function compare({ outDir, maxLag }) {
  const [pgNodes, pgEdges, neoNodes, neoEdges] = await Promise.all([
    read("pg.nodes.jsonl"), read("pg.edges.jsonl"),
    read("neo.nodes.jsonl"), read("neo.edges.jsonl")
  ]);

  const idSetPG = new Set(pgNodes.map(n => n.id));
  const idSetNEO = new Set(neoNodes.map(n => n.id));

  const missingInNeo = [...idSetPG].filter(id => !idSetNEO.has(id));
  const missingInPg  = [...idSetNEO].filter(id => !idSetPG.has(id));

  // Referential integrity (PG)
  const nodePG = new Set(pgNodes.map(n => n.id));
  const orphansPG = pgEdges.filter(e => !nodePG.has(e.src) || !nodePG.has(e.dst));

  // Deterministic content hash deltas
  const byId = (arr) => Object.fromEntries(arr.map(x => [x.id ?? `${x.src}|${x.rel}|${x.dst}`, canonicalHash(x)]));
  const nodeDelta = diffMaps(byId(pgNodes), byId(neoNodes));
  const edgeDelta = diffMaps(byId(pgEdges), byId(neoEdges));

  const totals = {
    pg: { nodes: pgNodes.length, edges: pgEdges.length },
    neo:{ nodes: neoNodes.length, edges: neoEdges.length }
  };

  const lagRate = (missingInNeo.length + missingInPg.length) / Math.max(totals.pg.nodes, 1);
  const violation = lagRate > maxLag || orphansPG.length > 0 || nodeDelta.count > 0 || edgeDelta.count > 0;

  return {
    totals, lagRate, violation,
    missingInNeoCount: missingInNeo.length,
    missingInPgCount:  missingInPg.length,
    orphansPG: orphansPG.slice(0, 50),
    nodeDelta: nodeDelta.count,
    edgeDelta: edgeDelta.count,
    timestamp: new Date().toISOString()
  };

  async function read(name){
    try {
        const content = await fs.readFile(`${outDir}/${name}`, "utf8");
        if (!content.trim()) return [];
        return content.trim().split("\n").filter(Boolean).map(JSON.parse);
    } catch (e) {
        if (e.code === 'ENOENT') return []; // Missing file treated as empty
        throw e;
    }
  }
  function diffMaps(a,b){ let c=0; for (const k of new Set([...Object.keys(a),...Object.keys(b)]))
    if (a[k] !== b[k]) c++; return {count:c}; }
}

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { MerkleNode, Sha256 } from "../interfaces.js";

function sha256(buf: Buffer | string): Sha256 {
  return createHash("sha256").update(buf).digest("hex");
}

export function buildMerkleTree(rootDir: string, ignore: (relPath: string) => boolean): MerkleNode {
  function walk(rel: string): MerkleNode {
    const abs = path.join(rootDir, rel);
    const st = fs.statSync(abs);
    const token = rel || ".";
    if (st.isFile()) {
      const data = fs.readFileSync(abs);
      return { path_token: token, hash: sha256(data) };
    }
    const entries = fs.readdirSync(abs).sort();
    const kids: MerkleNode[] = [];
    for (const name of entries) {
      const childRel = rel ? `${rel}/${name}` : name;
      if (ignore(childRel)) continue;
      kids.push(walk(childRel));
    }
    const combined = kids.map(k => `${k.path_token}:${k.hash}`).join("|");
    return { path_token: token, hash: sha256(combined), children: kids };
  }
  return walk("");
}

export function diffMerkle(a: MerkleNode, b: MerkleNode): string[] {
  const out: string[] = [];
  function rec(x?: MerkleNode, y?: MerkleNode) {
    if (!x && !y) return;
    if (x && !y) {
      out.push(x.path_token);
      return;
    }
    if (!x && y) return;

    if (x && y) {
      if (x.hash === y.hash) return;
      if (!x.children || !y.children) {
        out.push(x.path_token);
        return;
      }
      const mapY = new Map(y.children.map(c => [c.path_token, c]));
      for (const cx of x.children) {
        rec(cx, mapY.get(cx.path_token));
      }
      // Check for items in Y not in X
      const mapX = new Map(x.children.map(c => [c.path_token, c]));
      for (const cy of y.children) {
        if (!mapX.has(cy.path_token)) {
          // We could optionally add deleted items here if we wanted bidirectional sync.
        }
      }
    }
  }
  rec(a, b);
  return Array.from(new Set(out)).sort();
}

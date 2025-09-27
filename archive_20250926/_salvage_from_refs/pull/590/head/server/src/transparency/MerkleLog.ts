import crypto from "crypto";

export type LogEntry = {
  id: string;
  type: "issue" | "revoke";
  entitlementId: string;
  payload: any;
  ts: number;
};

export class MerkleLog {
  private leaves: string[] = [];
  private root = "";

  private h(data: string) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  append(entry: LogEntry) {
    const leaf = this.h(JSON.stringify(entry));
    this.leaves.push(leaf);
    this.root = this.computeRoot(this.leaves);
    return { leaf, root: this.root };
  }

  computeRoot(leaves: string[]) {
    let level = leaves.slice();
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const a = level[i];
        const b = level[i + 1] || a;
        next.push(this.h(a + b));
      }
      level = next;
    }
    return level[0] || this.h("empty");
  }

  proof(index: number) {
    const path: string[] = [];
    let level = this.leaves.slice();
    let idx = index;
    while (level.length > 1) {
      const pair = idx ^ 1;
      path.push(level[pair] ?? level[idx]);
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(this.h(level[i] + (level[i + 1] || level[i])));
      }
      level = next;
      idx = Math.floor(idx / 2);
    }
    return { path, root: this.root };
  }
}

import * as natural from 'natural';
export function cluster(messages: string[], k = 6) {
  const tfidf = new natural.TfIdf();
  messages.forEach((m) => tfidf.addDocument(m));
  const vecs = messages.map((_, i) => {
    const v: Record<string, number> = {};
    tfidf.listTerms(i).forEach((t) => (v[t.term] = t.tfidf));
    return v;
  });
  // k-means (simple)
  const terms = [...new Set(vecs.flatMap((v) => Object.keys(v)))];
  const toArr = (v: any) => terms.map((t) => v[t] || 0);
  return kmeans(vecs.map(toArr), k).assignments;
}
function kmeans(X: number[][], k: number, it = 20) {
  const C = X.slice(0, k);
  let A = new Array(X.length).fill(0);
  for (let t = 0; t < it; t++) {
    // assign
    for (let i = 0; i < X.length; i++) {
      let best = 0,
        bv = 1e9;
      for (let j = 0; j < k; j++) {
        const d = dist2(X[i], C[j]);
        if (d < bv) {
          bv = d;
          best = j;
        }
      }
      A[i] = best;
    }
    // update
    for (let j = 0; j < k; j++) {
      const pts = X.filter((_, i) => A[i] === j);
      if (pts.length) C[j] = mean(pts);
    }
  }
  return { centroids: C, assignments: A };
}
const dist2 = (a: number[], b: number[]) =>
  a.reduce((s, _, i) => s + Math.pow(a[i] - b[i], 2), 0);
const mean = (M: number[][]) =>
  M[0].map((_, i) => M.reduce((s, m) => s + m[i], 0) / M.length);

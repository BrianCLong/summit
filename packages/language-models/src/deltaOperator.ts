export type Matrix = number[][];
export type Vector = number[];

export interface ApplyDeltaOperatorInput {
  X: Matrix | Vector;
  k: Vector;
  v: number | Vector;
  beta: number;
  eps?: number;
}

export interface DeriveDeltaParamsInput {
  queryEmbedding: Vector;
  retrievedContextEmbedding: Vector;
  confidence: number;
  novelty?: number;
  config?: DeltaParamConfig;
  valueDimensions?: number;
}

export interface DeltaParamConfig {
  slope?: number;
  bias?: number;
  eps?: number;
}

export interface DeltaParams {
  k: Vector;
  v: number | Vector;
  beta: number;
}

const defaultEps = 1e-8;

export const clampBeta = (beta: number): number => {
  return Math.min(2, Math.max(0, beta));
};

export const normalize = (vec: Vector, eps: number = defaultEps): Vector => {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm < eps) {
    return Array(vec.length).fill(0);
  }
  return vec.map((val) => val / norm);
};

export const outer = (a: Vector, b: Vector): Matrix => {
  return a.map((ai) => b.map((bj) => ai * bj));
};

const toMatrix = (X: Matrix | Vector): { matrix: Matrix; wasVector: boolean } => {
  const first = (X as Matrix | Vector)[0] as unknown;
  const isMatrix = Array.isArray(first);
  if (isMatrix) {
    return { matrix: X as Matrix, wasVector: false };
  }
  const vector = X as Vector;
  return { matrix: vector.map((v) => [v]), wasVector: true };
};

const fromMatrix = (matrix: Matrix, wasVector: boolean): Matrix | Vector => {
  if (!wasVector) {
    return matrix;
  }
  return matrix.map((row) => row[0]);
};

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

const cosineSimilarity = (a: Vector, b: Vector, eps: number = defaultEps): number => {
  if (a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) + eps;
  return dot / denom;
};

export const applyDeltaOperator = ({ X, k, v, beta, eps = defaultEps }: ApplyDeltaOperatorInput): Matrix | Vector => {
  const clampedBeta = clampBeta(beta);
  const { matrix: state, wasVector } = toMatrix(X);
  const normalizedK = normalize(k, eps);
  const valueVector: Vector = Array.isArray(v) ? (v as Vector) : [v];
  const dv = state[0]?.length ?? 0;
  const expandedV = valueVector.length === dv ? valueVector : Array(dv).fill(valueVector[0] ?? 0);
  const kTx: Vector = Array(dv).fill(0);

  for (let col = 0; col < dv; col += 1) {
    for (let i = 0; i < normalizedK.length; i += 1) {
      kTx[col] += normalizedK[i] * (state[i]?.[col] ?? 0);
    }
  }

  const nextState: Matrix = state.map((row, rowIndex) => {
    const kVal = normalizedK[rowIndex] ?? 0;
    return row.map((value, colIndex) => {
      return value - clampedBeta * kVal * kTx[colIndex] + clampedBeta * kVal * expandedV[colIndex];
    });
  });

  return fromMatrix(nextState, wasVector);
};

export const deriveDeltaParams = ({
  queryEmbedding,
  retrievedContextEmbedding,
  confidence,
  novelty,
  config,
  valueDimensions = 1,
}: DeriveDeltaParamsInput): DeltaParams => {
  const eps = config?.eps ?? defaultEps;
  const k = normalize(queryEmbedding, eps);
  const noveltyScore = novelty ?? Math.max(0, 1 - cosineSimilarity(queryEmbedding, retrievedContextEmbedding, eps));
  const slope = config?.slope ?? 4;
  const bias = config?.bias ?? 0;
  const beta = clampBeta(2 * sigmoid(slope * (noveltyScore - confidence) + bias));

  const normalizedContext = normalize(retrievedContextEmbedding, eps);
  const v: Vector | number = valueDimensions === 1
    ? normalizedContext[0] ?? 0
    : normalizedContext.slice(0, valueDimensions).concat(Array(Math.max(0, valueDimensions - normalizedContext.length)).fill(0));

  return { k, v, beta };
};

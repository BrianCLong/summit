#!/bin/bash

# Fix error.errors -> error.issues in routes.ts
sed -i 's/error\.errors/error.issues/g' src/api/routes.ts

# Fix unused variables
sed -i 's/async (req: Request, res: Response)$/async (_req: Request, res: Response)/g' src/api/routes.ts

# Fix unused next parameter
sed -i 's/(err: Error, req: express\.Request, res: express\.Response, next: express\.NextFunction)/(err: Error, req: express.Request, res: express.Response, _next: express.NextFunction)/g' src/index.ts

# Fix weights parameter
sed -i 's/private buildRationale(features: ERFeatures, weights: Record<string, number>)/private buildRationale(features: ERFeatures)/g' src/scoring/scorer.ts

# Fix private config in HybridScorer
sed -i 's/constructor(private config: ScoringConfig)/constructor(config: ScoringConfig)/g' src/scoring/scorer.ts

# Fix z.record() calls
sed -i 's/z\.record(z\.unknown())/z.record(z.string(), z.unknown())/g' src/types.ts


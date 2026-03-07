# Data Inventory Candidates (Automated Scan)

| Keyword    | File                                                 | Line | Snippet                                                                                        |
| :--------- | :--------------------------------------------------- | :--- | :--------------------------------------------------------------------------------------------- |
| secret     | `server/src/agents/swarm/ConsensusEngine.ts`         | 8    | `const SHARED_SECRET = process.env.SWARM_SECRET \|\| 'dev-secret-key';`                        |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 338  | `* Perform face detection and recognition`                                                     |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 348  | `Face detection not supported for media type: ${mediaType},`                                   |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 363  | `for (const face of faces) {`                                                                  |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 365  | `entityType: 'face',`                                                                          |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 366  | `boundingBox: face.boundingBox,`                                                               |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 367  | `confidence: face.confidence,`                                                                 |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 371  | `landmarks: face.landmarks,`                                                                   |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 372  | `age: face.estimatedAge,`                                                                      |
| gender     | `server/src/ai/ExtractionEngine.ts`                  | 373  | `gender: face.estimatedGender,`                                                                |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 373  | `gender: face.estimatedGender,`                                                                |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 374  | `emotion: face.dominantEmotion,`                                                               |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 375  | `identity: face.recognizedIdentity,`                                                           |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 376  | `features: face.featureVector,`                                                                |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 783  | `// Run Face Detection`                                                                        |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 794  | `Face detection failed for frame ${frame.frameNumber}: ${faceError.message},`                  |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 797  | `Face detection for frame ${frame.frameNumber} failed: ${faceError.message},`                  |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 905  | `(entity.entityType === 'face' \|\| entity.entityType === 'object')`                           |
| token      | `server/src/ai/ExtractionEngine.ts`                  | 1014 | `* Calculate text similarity using simple token overlap`                                       |
| face       | `server/src/ai/ExtractionEngine.ts`                  | 1110 | `face: this.faceEngine.isReady(),`                                                             |
| ssn        | `server/src/ai/copilot/guardrails.service.ts`        | 590  | `sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');`                            |
| email      | `server/src/ai/copilot/guardrails.service.ts`        | 593  | `'[EMAIL]',`                                                                                   |
| phone      | `server/src/ai/copilot/guardrails.service.ts`        | 597  | `'[PHONE]',`                                                                                   |
| location   | `server/src/ai/copilot/nl-query.service.ts`          | 357  | `'Location',`                                                                                  |
| secret     | `server/src/ai/copilot/redaction.service.ts`         | 33   | `'SECRET',`                                                                                    |
| ssn        | `server/src/ai/copilot/redaction.service.ts`         | 321  | `{ pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },`                                          |
| email      | `server/src/ai/copilot/redaction.service.ts`         | 325  | `type: 'EMAIL',`                                                                               |
| phone      | `server/src/ai/copilot/redaction.service.ts`         | 329  | `type: 'PHONE',`                                                                               |
| secret     | `server/src/ai/copilot/redaction.service.ts`         | 333  | `{ pattern: /\bTOP SECRET\b/gi, type: 'CLASSIFICATION_MARKER' },`                              |
| ssn        | `server/src/ai/copilot/redaction.service.ts`         | 510  | `/\b\d{3}-\d{2}-\d{4}\b/, // SSN`                                                              |
| secret     | `server/src/ai/copilot/redaction.service.ts`         | 513  | `/\bTOP SECRET\b/i,`                                                                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 93   | `* Initialize face detection engine`                                                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 107  | `logger.info('Face Detection Engine initialized successfully');`                               |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 109  | `logger.error('Failed to initialize Face Detection Engine:', error);`                          |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 136  | `logger.info(Starting face detection for: ${imagePath});`                                      |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 139  | `// Run primary face detection`                                                                |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 146  | `// Process each detected face`                                                                |
| gender     | `server/src/ai/engines/FaceDetectionEngine.ts`       | 194  | `// Estimate gender`                                                                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 209  | `Face detection completed: ${qualifiedDetections.length} faces detected,`                      |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 213  | `logger.error('Face detection failed:', error);`                                               |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 238  | `logger.info(Starting video face detection for: ${videoPath});`                                |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 260  | `Video face detection completed: ${results.length} frames processed,`                          |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 264  | `logger.error('Video face detection failed:', error);`                                         |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 270  | `* Run primary face detection using MTCNN`                                                     |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 287  | `'--min-face-size',`                                                                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 313  | `Face detection failed with code ${code}: ${errorOutput},`                                     |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 329  | `reject(new Error(Failed to spawn face detection: ${error.message}));`                         |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 335  | `* Run video face detection`                                                                   |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 358  | `'--min-face-size',`                                                                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 386  | `reject(new Error(Video face detection failed: ${errorOutput}));`                              |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 401  | `new Error(Failed to spawn video face detection: ${error.message}),`                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 480  | `* Extract face features for recognition`                                                      |
| gender     | `server/src/ai/engines/FaceDetectionEngine.ts`       | 638  | `* Estimate gender`                                                                            |
| gender     | `server/src/ai/engines/FaceDetectionEngine.ts`       | 674  | `resolve(result.gender \|\| 'unknown');`                                                       |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 690  | `* Parse face detection results`                                                               |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 695  | `for (const face of results.faces \|\| []) {`                                                  |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 698  | `x: Math.round(face.bbox[0]),`                                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 699  | `y: Math.round(face.bbox[1]),`                                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 700  | `width: Math.round(face.bbox[2]),`                                                             |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 701  | `height: Math.round(face.bbox[3]),`                                                            |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 702  | `confidence: face.confidence,`                                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 704  | `confidence: face.confidence,`                                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 706  | `x: face.bbox[0],`                                                                             |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 707  | `y: face.bbox[1],`                                                                             |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 708  | `width: face.bbox[2],`                                                                         |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 709  | `height: face.bbox[3],`                                                                        |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 718  | `* Parse video face detection results`                                                         |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 743  | `* Apply face tracking across video frames`                                                    |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 768  | `const face = unmatchedFaces[i];`                                                              |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 772  | `face.boundingBox,`                                                                            |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 777  | `if (face.featureVector && lastFace.featureVector) {`                                          |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 779  | `face.featureVector,`                                                                          |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 787  | `bestMatch = face;`                                                                            |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 802  | `for (const face of unmatchedFaces) {`                                                         |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 804  | `tracks.set(trackId, [face]);`                                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 824  | `* Apply temporal smoothing to face attributes`                                                |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 835  | `logger.debug('Temporal smoothing applied to face detection results');`                        |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 839  | `* Calculate face quality score`                                                               |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 844  | `// Factor in face size (larger faces are typically higher quality)`                           |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 1048 | `// Load MTCNN and other face analysis models`                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 1049 | `logger.info('Face detection models loaded');`                                                 |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 1061 | `* Check if face detection engine is ready`                                                    |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 1071 | `logger.info('Shutting down Face Detection Engine...');`                                       |
| face       | `server/src/ai/engines/FaceDetectionEngine.ts`       | 1073 | `logger.info('Face Detection Engine shutdown complete');`                                      |
| face       | `server/src/ai/models/cv_integration.ts`             | 8    | `import { FaceAnalyzer } from '@intelgraph/face-analysis';`                                    |
| face       | `server/src/ai/models/cv_integration.ts`             | 77   | `console.log('✓ Face analyzer initialized');`                                                  |
| face       | `server/src/ai/models/cv_integration.ts`             | 123  | `* Get face analyzer`                                                                          |
| face       | `server/src/ai/models/cv_integration.ts`             | 127  | `throw new Error('Face analyzer not initialized');`                                            |
| location   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 170  | `const location = match[1];`                                                                   |
| latitude   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 174  | `WHERE n.latitude IS NOT NULL`                                                                 |
| longitude  | `server/src/ai/nl-graph-query/query-patterns.ts`     | 175  | `AND n.longitude IS NOT NULL`                                                                  |
| latitude   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 177  | `point({latitude: n.latitude, longitude: n.longitude}),`                                       |
| longitude  | `server/src/ai/nl-graph-query/query-patterns.ts`     | 177  | `point({latitude: n.latitude, longitude: n.longitude}),`                                       |
| latitude   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 178  | `point({latitude: $lat, longitude: $lon})`                                                     |
| longitude  | `server/src/ai/nl-graph-query/query-patterns.ts`     | 178  | `point({latitude: $lat, longitude: $lon})`                                                     |
| latitude   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 184  | `point({latitude: n.latitude, longitude: n.longitude}),`                                       |
| longitude  | `server/src/ai/nl-graph-query/query-patterns.ts`     | 184  | `point({latitude: n.latitude, longitude: n.longitude}),`                                       |
| latitude   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 185  | `point({latitude: $lat, longitude: $lon})`                                                     |
| longitude  | `server/src/ai/nl-graph-query/query-patterns.ts`     | 185  | `point({latitude: $lat, longitude: $lon})`                                                     |
| location   | `server/src/ai/nl-graph-query/query-patterns.ts`     | 195  | `description: 'Finds entities near a location within a time window',`                          |
| email      | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` | 347  | `const piiFields = ['EMAIL', 'PHONE', 'SSN', 'ADDRESS', 'NAME'];`                              |
| ssn        | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` | 347  | `const piiFields = ['EMAIL', 'PHONE', 'SSN', 'ADDRESS', 'NAME'];`                              |
| phone      | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` | 347  | `const piiFields = ['EMAIL', 'PHONE', 'SSN', 'ADDRESS', 'NAME'];`                              |
| address    | `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` | 347  | `const piiFields = ['EMAIL', 'PHONE', 'SSN', 'ADDRESS', 'NAME'];`                              |
| uuid       | `server/src/analysis/GraphAnalysisService.ts`        | 17   | `import { v4 as uuidv4 } from 'uuid';`                                                         |
| auth       | `server/src/app/makeServer.ts`                       | 7    | `import { getContext } from '../lib/auth.js';`                                                 |
| auth       | `server/src/app/makeServer.ts`                       | 34   | `// Base context via application auth`                                                         |
| email      | `server/src/app/makeServer.ts`                       | 42   | `email: 'test@intelgraph.local',`                                                              |
| auth       | `server/src/app.ts`                                  | 39   | `import { getContext } from './lib/auth.js';`                                                  |
| auth       | `server/src/app.ts`                                  | 261  | `// Authentication routes (exempt from global auth middleware)`                                |
| auth       | `server/src/app.ts`                                  | 262  | `app.use('/auth', authRouter);`                                                                |
| auth       | `server/src/app.ts`                                  | 263  | `app.use('/api/auth', authRouter); // Alternative path`                                        |
| auth       | `server/src/app.ts`                                  | 460  | `// Development mode - relaxed auth for easier testing`                                        |
| token      | `server/src/app.ts`                                  | 462  | `const token = authHeader && authHeader.split(' ')[1];`                                        |
| token      | `server/src/app.ts`                                  | 464  | `if (!token) {`                                                                                |
| token      | `server/src/app.ts`                                  | 465  | `console.warn('Development: No token provided, allowing request');`                            |
| email      | `server/src/app.ts`                                  | 468  | `email: 'dev@intelgraph.local',`                                                               |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 714  | `id UUID PRIMARY KEY,`                                                                         |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 718  | `correlation_id UUID,`                                                                         |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 719  | `session_id UUID,`                                                                             |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 720  | `request_id UUID,`                                                                             |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 751  | `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`                                               |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 760  | `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`                                               |
| uuid       | `server/src/audit/advanced-audit-system.ts`          | 761  | `correlation_id UUID NOT NULL,`                                                                |
| address    | `server/src/audit/advanced-audit-system.ts`          | 1029 | `Address ${criticalCount} critical violations immediately,`                                    |
| uuid       | `server/src/audit/audit-types.ts`                    | 187  | `id: string;                           // UUID v4`                                             |
| address    | `server/src/audit/audit-types.ts`                    | 233  | `ipAddress?: string;                   // Client IP address`                                   |
| ip         | `server/src/audit/audit-types.ts`                    | 233  | `ipAddress?: string;                   // Client IP address`                                   |
| address    | `server/src/audit/audit-types.ts`                    | 234  | `ipAddressV6?: string;                 // IPv6 address`                                        |
| ipv6       | `server/src/audit/audit-types.ts`                    | 234  | `ipAddressV6?: string;                 // IPv6 address`                                        |
| latitude   | `server/src/audit/audit-types.ts`                    | 240  | `coordinates?: [number, number];     // [longitude, latitude]`                                 |
| longitude  | `server/src/audit/audit-types.ts`                    | 240  | `coordinates?: [number, number];     // [longitude, latitude]`                                 |
| uuid       | `server/src/audit/audit-types.ts`                    | 287  | `correlationId: z.string().uuid(),`                                                            |
| uuid       | `server/src/audit/audit-types.ts`                    | 288  | `sessionId: z.string().uuid().optional(),`                                                     |
| uuid       | `server/src/audit/audit-types.ts`                    | 289  | `requestId: z.string().uuid().optional(),`                                                     |
| uuid       | `server/src/audit/audit-types.ts`                    | 290  | `parentEventId: z.string().uuid().optional(),`                                                 |
| email      | `server/src/audit/audit-types.ts`                    | 462  | `email?: string;`                                                                              |
| auth       | `server/src/audit/forensics-logger.ts`               | 65   | `\| 'auth'`                                                                                    |
| ip         | `server/src/audit/forensics-logger.ts`               | 79   | `ip?: string;`                                                                                 |
| email      | `server/src/audit/forensics-logger.ts`               | 85   | `email?: string;`                                                                              |
| ip         | `server/src/audit/forensics-logger.ts`               | 88   | `ip?: string;`                                                                                 |
| auth       | `server/src/audit/forensics-logger.ts`               | 354  | `category: 'auth',`                                                                            |
| secret     | `server/src/audit/forensics-logger.ts`               | 393  | `severity: target.classification === 'secret' \|\| target.classification === 'top-secret'`     |
| account    | `server/src/audit/forensics-logger.ts`               | 555  | `limit * 2 // Read more to account for filtering`                                              |
| password   | `server/src/audit/index.ts`                          | 24   | `password: cfg.REDIS_PASSWORD \|\| undefined,`                                                 |
| token      | `server/src/auth/github-actions-oidc.ts`             | 5    | `* Implements secure OIDC token exchange for GitHub Actions CI/CD:`                            |
| token      | `server/src/auth/github-actions-oidc.ts`             | 6    | `* - Token validation against GitHub's OIDC provider`                                          |
| auth       | `server/src/auth/github-actions-oidc.ts`             | 11   | `* @module auth/github-actions-oidc`                                                           |
| token      | `server/src/auth/github-actions-oidc.ts`             | 27   | `iss: string;        // https://token.actions.githubusercontent.com`                           |
| token      | `server/src/auth/github-actions-oidc.ts`             | 89   | `token: string;`                                                                               |
| token      | `server/src/auth/github-actions-oidc.ts`             | 107  | `issuer: 'https://token.actions.githubusercontent.com',`                                       |
| token      | `server/src/auth/github-actions-oidc.ts`             | 109  | `jwksUri: 'https://token.actions.githubusercontent.com/.well-known/jwks',`                     |
| token      | `server/src/auth/github-actions-oidc.ts`             | 146  | `* Verify GitHub Actions OIDC token`                                                           |
| token      | `server/src/auth/github-actions-oidc.ts`             | 148  | `async verifyToken(token: string): Promise<GitHubIdentity> {`                                  |
| token      | `server/src/auth/github-actions-oidc.ts`             | 150  | `const cached = this.tokenCache.get(token);`                                                   |
| token      | `server/src/auth/github-actions-oidc.ts`             | 157  | `const decoded = jwt.decode(token, { complete: true });`                                       |
| token      | `server/src/auth/github-actions-oidc.ts`             | 159  | `throw new Error('Invalid token format');`                                                     |
| token      | `server/src/auth/github-actions-oidc.ts`             | 164  | `throw new Error('Missing key ID in token header');`                                           |
| token      | `server/src/auth/github-actions-oidc.ts`             | 170  | `// Verify token`                                                                              |
| token      | `server/src/auth/github-actions-oidc.ts`             | 171  | `const claims = jwt.verify(token, signingKey, {`                                               |
| token      | `server/src/auth/github-actions-oidc.ts`             | 197  | `this.tokenCache.set(token, { identity, expiresAt });`                                         |
| token      | `server/src/auth/github-actions-oidc.ts`             | 199  | `logger.info('GitHub Actions OIDC token verified', {`                                          |
| token      | `server/src/auth/github-actions-oidc.ts`             | 297  | `* Exchange GitHub OIDC token for service credential`                                          |
| credential | `server/src/auth/github-actions-oidc.ts`             | 297  | `* Exchange GitHub OIDC token for service credential`                                          |
| token      | `server/src/auth/github-actions-oidc.ts`             | 300  | `token: string,`                                                                               |
| token      | `server/src/auth/github-actions-oidc.ts`             | 303  | `const identity = await this.verifyToken(token);`                                              |
| credential | `server/src/auth/github-actions-oidc.ts`             | 308  | `// Generate service credential`                                                               |
| credential | `server/src/auth/github-actions-oidc.ts`             | 311  | `const credential: GitHubServiceCredential = {`                                                |
| token      | `server/src/auth/github-actions-oidc.ts`             | 312  | `token: serviceToken,`                                                                         |
| token      | `server/src/auth/github-actions-oidc.ts`             | 319  | `logger.info('GitHub OIDC token exchanged for service credential', {`                          |
| credential | `server/src/auth/github-actions-oidc.ts`             | 319  | `logger.info('GitHub OIDC token exchanged for service credential', {`                          |
| credential | `server/src/auth/github-actions-oidc.ts`             | 325  | `return credential;`                                                                           |
| token      | `server/src/auth/github-actions-oidc.ts`             | 363  | `* Generate service token for the credential`                                                  |
| credential | `server/src/auth/github-actions-oidc.ts`             | 363  | `* Generate service token for the credential`                                                  |
| secret     | `server/src/auth/github-actions-oidc.ts`             | 381  | `const secret = process.env.GITHUB_OIDC_INTERNAL_SECRET \|\| process.env.JWT_SECRET;`          |
| secret     | `server/src/auth/github-actions-oidc.ts`             | 382  | `if (!secret) {`                                                                               |
| secret     | `server/src/auth/github-actions-oidc.ts`             | 383  | `throw new Error('No signing secret configured');`                                             |
| secret     | `server/src/auth/github-actions-oidc.ts`             | 386  | `return jwt.sign(payload, secret, { algorithm: 'HS256' });`                                    |
| credential | `server/src/auth/github-actions-oidc.ts`             | 390  | `* Build scope string for the credential`                                                      |
| token      | `server/src/auth/github-actions-oidc.ts`             | 448  | `// Check for GitHub Actions OIDC token`                                                       |
| token      | `server/src/auth/github-actions-oidc.ts`             | 450  | `const ghToken = req.headers['x-github-token'] as string;`                                     |
| token      | `server/src/auth/github-actions-oidc.ts`             | 452  | `const token = ghToken \|\| (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);` |
| token      | `server/src/auth/github-actions-oidc.ts`             | 454  | `if (!token) {`                                                                                |
| token      | `server/src/auth/github-actions-oidc.ts`             | 456  | `error: 'GitHub Actions OIDC token required',`                                                 |
| token      | `server/src/auth/github-actions-oidc.ts`             | 462  | `const identity = await authenticator.verifyToken(token);`                                     |
| auth       | `server/src/auth/multi-tenant-rbac.ts`               | 12   | `* @module auth/multi-tenant-rbac`                                                             |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 26   | `classification: 'unclassified' \| 'cui' \| 'secret' \| 'top-secret';`                         |
| email      | `server/src/auth/multi-tenant-rbac.ts`               | 37   | `email: string;`                                                                               |
| location   | `server/src/auth/multi-tenant-rbac.ts`               | 64   | `location?: string;`                                                                           |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 75   | `\| 'secret'`                                                                                  |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 76   | `\| 'top-secret'`                                                                              |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 77   | `\| 'top-secret-sci';`                                                                         |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 502  | `'secret': 2,`                                                                                 |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 503  | `'top-secret': 3,`                                                                             |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 504  | `'top-secret-sci': 4,`                                                                         |
| secret     | `server/src/auth/multi-tenant-rbac.ts`               | 522  | `const sensitiveClassifications = ['secret', 'top-secret', 'top-secret-sci'];`                 |
| auth       | `server/src/auth/multi-tenant-rbac.ts`               | 718  | `logger.error('Multi-tenant auth middleware error', {`                                         |
| token      | `server/src/auth/types.ts`                           | 27   | `\| 'jwt'      // Bearer token (OIDC/OAuth)`                                                   |
| email      | `server/src/auth/types.ts`                           | 37   | `email?: string;`                                                                              |
| token      | `server/src/auth/webauthn/middleware.ts`             | 6    | `// In production, check for MFA/Step-Up token`                                                |
| ...        | ...                                                  | ...  | (Truncated 6361 more matches)                                                                  |

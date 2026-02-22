import { z } from 'zod/v4';

export const RiskLevel = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RiskCategory = z.enum(['SCHEMA', 'SECURITY', 'INFRA', 'UX', 'LOGIC', 'UNKNOWN']);
export type RiskCategory = z.infer<typeof RiskCategory>;

export const PRRiskAssessmentSchema = z.object({
  riskLevel: RiskLevel,
  categories: z.array(RiskCategory),
  reasons: z.array(z.string()),
});
export type PRRiskAssessment = z.infer<typeof PRRiskAssessmentSchema>;

export class PRRiskClassifierService {
  private patterns = {
    SCHEMA: [
      /\.sql$/,
      /schema\.prisma$/,
      /\.graphql$/,
      /\.gql$/,
      /migrations\//,
      /server\/src\/db\/schema\//
    ],
    SECURITY: [
      /package\.json$/,
      /pnpm-lock\.yaml$/,
      /requirements\.txt$/,
      /pyproject\.toml$/,
      /Auth.*\.ts$/,
      /Policy.*\.ts$/,
      /\.rego$/,
      /server\/src\/security\//,
      /server\/src\/middleware\/auth\.ts/,
      /\.env.*/
    ],
    INFRA: [
      /Dockerfile.*/,
      /docker-compose.*\.yml$/,
      /helm\//,
      /k8s\//,
      /terraform\//,
      /\.tf$/,
      /\.github\//,
      /scripts\//,
      /tsconfig\.json$/
    ],
    UX: [
      /apps\/web\//,
      /client\//,
      /\.tsx$/,
      /\.css$/,
      /\.scss$/,
      /\.less$/
    ]
  };

  /**
   * Classifies a PR based on the list of modified files.
   * @param files List of file paths modified in the PR
   * @returns PRRiskAssessment
   */
  public classify(files: string[]): PRRiskAssessment {
    const categories = new Set<RiskCategory>();
    const reasons: string[] = [];

    // Default to LOW if no files or only unknown/safe files
    let calculatedRisk: RiskLevel = 'LOW';

    for (const file of files) {
      let matched = false;

      // Check Schema
      if (this.matches(file, this.patterns.SCHEMA)) {
        categories.add('SCHEMA');
        reasons.push(`Schema change detected: ${file}`);
        matched = true;
      }

      // Check Security
      if (this.matches(file, this.patterns.SECURITY)) {
        categories.add('SECURITY');
        reasons.push(`Security critical file modified: ${file}`);
        matched = true;
      }

      // Check Infra
      if (this.matches(file, this.patterns.INFRA)) {
        categories.add('INFRA');
        reasons.push(`Infrastructure configuration changed: ${file}`);
        matched = true;
      }

      // Check UX
      if (this.matches(file, this.patterns.UX)) {
        categories.add('UX');
        matched = true;
      }

      // Check Logic (Backend code that isn't one of the above)
      if (!matched) {
         if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.go') || file.endsWith('.rs')) {
             categories.add('LOGIC');
             matched = true;
         } else {
             categories.add('UNKNOWN');
         }
      }
    }

    // Determine overall Risk Level based on categories present
    if (categories.has('SCHEMA') || categories.has('SECURITY') || categories.has('INFRA')) {
        calculatedRisk = 'HIGH';
    } else if (categories.has('LOGIC')) {
        calculatedRisk = 'MEDIUM';
    } else if (categories.has('UX')) {
        // Pure UX changes are typically lower risk for backend stability,
        // though they can be high risk for product.
        // For this system's context (infra/backend focus), we'll keep it LOW or MEDIUM?
        // Let's go with LOW for now, as it doesn't threaten data integrity or security.
        calculatedRisk = 'LOW';
    } else {
        // Docs, tests, etc.
        calculatedRisk = 'LOW';
    }

    return {
      riskLevel: calculatedRisk,
      categories: Array.from(categories),
      reasons
    };
  }

  private matches(file: string, patterns: RegExp[]): boolean {
    return patterns.some(p => p.test(file));
  }
}

export const prRiskClassifier = new PRRiskClassifierService();

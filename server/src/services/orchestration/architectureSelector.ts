export type OrchestrationArchitecture = "SINGLE_AGENT" | "CENTRALIZED" | "HYBRID";

export interface TaskSignalFeatures {
  id: string;
  name?: string;
  decomposabilityScore: number;
  estimatedToolCount: number;
  sequentialDependencyScore: number;
  riskScore: number;
  timeCriticalityScore: number;
}

export interface StepResult {
  stepIndex: number;
  success: boolean;
}

export interface ErrorMetrics {
  amplificationFactor: number;
  totalSteps: number;
  errorSteps: number;
  architecture: OrchestrationArchitecture;
  recommendation: OrchestrationArchitecture;
}

export class ArchitectureSelector {
  private readonly defaultArchitecture: OrchestrationArchitecture = "CENTRALIZED";

  predictOptimalArchitecture(features: TaskSignalFeatures): OrchestrationArchitecture {
    const {
      decomposabilityScore,
      estimatedToolCount,
      sequentialDependencyScore,
      riskScore,
      timeCriticalityScore,
    } = features;

    if (sequentialDependencyScore >= 0.7) {
      return "SINGLE_AGENT";
    }

    if (decomposabilityScore >= 0.6 && estimatedToolCount <= 8) {
      return "CENTRALIZED";
    }

    if (estimatedToolCount >= 16) {
      return "HYBRID";
    }

    if (riskScore >= 0.8 && sequentialDependencyScore >= 0.4) {
      return "SINGLE_AGENT";
    }

    if (timeCriticalityScore >= 0.7 && decomposabilityScore >= 0.5) {
      return "CENTRALIZED";
    }

    return this.defaultArchitecture;
  }

  monitorErrorAmplification(
    architecture: OrchestrationArchitecture,
    stepResults: StepResult[]
  ): ErrorMetrics {
    const totalSteps = stepResults.length;
    const errorSteps = stepResults.filter((step) => !step.success).length;
    const amplificationFactor = totalSteps === 0 ? 0 : errorSteps / Math.max(totalSteps, 1);

    return {
      amplificationFactor,
      totalSteps,
      errorSteps,
      architecture,
      recommendation: this.recommendArchitectureFromError(architecture, amplificationFactor),
    };
  }

  private recommendArchitectureFromError(
    current: OrchestrationArchitecture,
    amplificationFactor: number
  ): OrchestrationArchitecture {
    if (amplificationFactor <= 0.1) {
      return current;
    }

    if (current === "CENTRALIZED" && amplificationFactor > 0.25) {
      return "SINGLE_AGENT";
    }

    if (current === "HYBRID" && amplificationFactor > 0.3) {
      return "CENTRALIZED";
    }

    if (current === "SINGLE_AGENT" && amplificationFactor > 0.2) {
      return "CENTRALIZED";
    }

    return current;
  }
}

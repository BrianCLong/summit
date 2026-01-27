export enum AttributionBand {
  LOW = "C1",
  MODERATE = "C2",
  HIGH = "C3"
}

export interface AttributionScore {
  technicalCertainty: number; // 0.0 - 1.0
  politicalRisk: number; // 0.0 - 1.0
}

export class ConfidenceBands {
  public static calculateBand(score: AttributionScore): AttributionBand {
    if (score.technicalCertainty > 0.8 && score.politicalRisk < 0.3) {
      return AttributionBand.HIGH;
    } else if (score.technicalCertainty > 0.5) {
      return AttributionBand.MODERATE;
    }
    return AttributionBand.LOW;
  }

  public static getDisclosureReadiness(band: AttributionBand): string {
    switch (band) {
      case AttributionBand.HIGH: return "Public / Legal";
      case AttributionBand.MODERATE: return "Partner Sharing";
      case AttributionBand.LOW: return "Internal Only";
    }
  }
}

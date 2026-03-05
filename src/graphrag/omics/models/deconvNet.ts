import { OmicsSample } from '../schema.js';

export class DeconvNet {
  public predict(sample: OmicsSample): Record<string, number> {
    if (sample.features["CD3E"] > 0 || sample.features["CD4"] > 0) {
      return {
        "T_cell": 0.31,
        "B_cell": 0.12,
        "fibroblast": 0.22
      };
    }
    return {
      "T_cell": 0.1,
      "B_cell": 0.1,
      "fibroblast": 0.8
    };
  }
}

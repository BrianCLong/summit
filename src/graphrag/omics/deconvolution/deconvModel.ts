import { DeconvNet } from '../models/deconvNet.js';
import { OmicsSample } from '../schema.js';

export class DeconvModel {
  private net: DeconvNet;

  constructor() {
    this.net = new DeconvNet();
  }

  public infer(sample: OmicsSample): Record<string, number> {
    if (process.env.SUMMIT_OMICS_DECONV !== "true") {
      throw new Error("Feature SUMMIT_OMICS_DECONV is disabled");
    }
    return this.net.predict(sample);
  }
}

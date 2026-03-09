import { canonicalizeJson } from "../utils/canonical-json";

export class ReplayEngine {
  public compareArtifacts(actual: any, expected: any): boolean {
    // Replace JSON.stringify with canonical serialization
    return canonicalizeJson(actual) === canonicalizeJson(expected);
  }
}

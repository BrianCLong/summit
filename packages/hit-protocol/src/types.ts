export interface HIT {
  subjectId: string; // content or account
  epoch: number; // period
  attestations: string[]; // attester sigs (blind or SD-JWT)
  score: number; // derived credibility
}

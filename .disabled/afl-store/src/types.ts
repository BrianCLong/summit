export interface Fingerprint {
  contentHash: string; // sha256 of normalized bytes
  formatSig: string; // "mime:len:pdfObj:EXIF|NOEXIF"
  timingSig: string; // "HHh:burstBin"
  xformSig: string; // KPW leaf or "nokpw"
  route: string; // ingress route id
  firstSeen?: number;
  lastSeen?: number;
  count?: number;
}

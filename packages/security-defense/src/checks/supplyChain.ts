import path from "path";
import { loadFile, findFiles, readJsonFile, findFirstExisting } from "../fs-utils.js";
import { CheckResult } from "../types.js";

type CycloneDxComponent = {
  name?: string;
  version?: string;
  purl?: string;
};

type CycloneDxDocument = {
  components?: CycloneDxComponent[];
};

const SBOM_PATTERNS = ["**/*sbom*.json", "**/*sbom*.xml"];
const PROVENANCE_PATTERNS = ["**/*provenance*.json", "**/*attestation*.json"];
const IMAGE_FILE_PATTERNS = [
  "k8s/**/*.{yml,yaml}",
  "helm/**/*.{yml,yaml}",
  "services/**/*.{yml,yaml}",
  "**/kubernetes/**/*.{yml,yaml}",
];

const imageRegex = /image:\s*"?([^"\s]+)"?/i;

const loadCycloneDx = (filePath: string): CycloneDxDocument | null =>
  readJsonFile<CycloneDxDocument>(filePath);

const extractImages = (filePath: string): string[] => {
  const content = loadFile(filePath);
  if (!content) {
    return [];
  }
  const matches = content
    .split(/\r?\n/)
    .map((line) => line.match(imageRegex)?.[1])
    .filter(Boolean) as string[];
  return matches;
};

const hasDigest = (image: string): boolean => image.includes("@sha256:");

export const runSupplyChainChecks = (
  root: string,
  sbomBaselinePath?: string,
  sbomTargetPath?: string
): CheckResult[] => {
  const results: CheckResult[] = [];
  const sboms = findFiles(root, SBOM_PATTERNS);
  const provenances = findFiles(root, PROVENANCE_PATTERNS);

  if (sboms.length === 0) {
    results.push({
      epic: "Epic 1",
      requirement: "SBOM generation",
      status: "fail",
      message: "No SBOM artifacts were found. Generate CycloneDX SBOMs for each service.",
      remediation: "Add SBOM generation to CI and persist artifacts under an auditable path.",
    });
  } else {
    results.push({
      epic: "Epic 1",
      requirement: "SBOM generation",
      status: "pass",
      message: `Found ${sboms.length} SBOM artifact(s).`,
      details: { sboms },
    });
  }

  if (provenances.length === 0) {
    results.push({
      epic: "Epic 1",
      requirement: "Provenance attestations",
      status: "fail",
      message: "No provenance attestations detected. Emits SLSA-aligned attestations for builds.",
      remediation: "Emit attestations alongside build outputs and store them next to SBOMs.",
    });
  } else {
    results.push({
      epic: "Epic 1",
      requirement: "Provenance attestations",
      status: "pass",
      message: `Found ${provenances.length} provenance attestation(s).`,
      details: { provenances },
    });
  }

  const imageFiles = findFiles(root, IMAGE_FILE_PATTERNS);
  const unpinnedImages: { file: string; image: string }[] = [];
  imageFiles.forEach((file) => {
    extractImages(file).forEach((image) => {
      if (!hasDigest(image)) {
        unpinnedImages.push({ file, image });
      }
    });
  });

  if (unpinnedImages.length > 0) {
    results.push({
      epic: "Epic 1",
      requirement: "Digest pinning",
      status: "fail",
      message: "Container images without digest pinning detected.",
      remediation: "Reference images with an immutable sha256 digest (e.g., repo@sha256:abc).",
      details: { unpinnedImages },
    });
  } else {
    results.push({
      epic: "Epic 1",
      requirement: "Digest pinning",
      status: "pass",
      message: "All referenced container images are digest-pinned.",
    });
  }

  const baselinePath =
    sbomBaselinePath ||
    findFirstExisting(root, ["sbom-baseline.json", path.join("artifacts", "sbom-baseline.json")]);
  const targetPath =
    sbomTargetPath ||
    findFirstExisting(root, ["sbom-latest.json", path.join("artifacts", "sbom-latest.json")]);

  if (baselinePath && targetPath) {
    const baseline = loadCycloneDx(baselinePath) ?? { components: [] };
    const target = loadCycloneDx(targetPath) ?? { components: [] };
    const baselineKeys = new Set(
      (baseline.components ?? []).map(
        (component) => component.purl || `${component.name}@${component.version}`
      )
    );
    const targetKeys = new Set(
      (target.components ?? []).map(
        (component) => component.purl || `${component.name}@${component.version}`
      )
    );

    const added = [...targetKeys].filter((item) => item && !baselineKeys.has(item));
    const removed = [...baselineKeys].filter((item) => item && !targetKeys.has(item));

    results.push({
      epic: "Epic 1",
      requirement: "SBOM diffing",
      status: added.length === 0 && removed.length === 0 ? "pass" : "fail",
      message:
        added.length === 0 && removed.length === 0
          ? "No SBOM drift detected between baseline and target."
          : "SBOM drift detected between baseline and target.",
      remediation:
        added.length || removed.length
          ? "Review dependency changes and approve via documented exception workflow."
          : undefined,
      details: { added, removed, baselinePath, targetPath },
    });
  } else {
    results.push({
      epic: "Epic 1",
      requirement: "SBOM diffing",
      status: "fail",
      message: "Missing SBOM baseline and/or target artifacts required for diffing.",
      remediation:
        "Persist baseline and current SBOMs (e.g., artifacts/sbom-baseline.json and artifacts/sbom-latest.json).",
    });
  }

  return results;
};

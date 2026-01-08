import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { manifestSchema, Manifest } from "./schema.js";

async function getFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

export interface VerificationResult {
  success: boolean;
  errors: string[];
}

export async function verifyManifest(
  manifestPath: string,
  exportDir: string
): Promise<VerificationResult> {
  const errors: string[] = [];

  // 1. Check if manifest exists
  let manifestContent: string;
  try {
    manifestContent = await fs.readFile(manifestPath, "utf-8");
  } catch (error) {
    return { success: false, errors: [`Manifest file not found at ${manifestPath}`] };
  }

  // 2. Validate manifest schema
  let manifest: Manifest;
  try {
    const manifestJson = JSON.parse(manifestContent);
    manifest = manifestSchema.parse(manifestJson);
  } catch (error: any) {
    if (error.errors) {
      const validationErrors = error.errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      return {
        success: false,
        errors: ["Manifest schema validation failed:", ...validationErrors],
      };
    }
    return {
      success: false,
      errors: ["Manifest file is not a valid JSON or does not match the schema."],
    };
  }

  // 3. Verify file hashes
  for (const [relativePath, fileInfo] of Object.entries(manifest.files)) {
    const filePath = path.join(exportDir, relativePath);
    const resolvedPath = path.resolve(filePath);
    const resolvedExportDir = path.resolve(exportDir);

    if (!resolvedPath.startsWith(resolvedExportDir)) {
      errors.push(`Path traversal detected for file: ${relativePath}`);
      continue;
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      errors.push(`File not found: ${relativePath}`);
      continue;
    }

    // Check file hash
    const actualHash = await getFileHash(filePath);
    if (actualHash !== fileInfo.hash) {
      errors.push(
        `Hash mismatch for file: ${relativePath}. Expected ${fileInfo.hash}, got ${actualHash}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

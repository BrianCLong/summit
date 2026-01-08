import fs from "fs/promises";
import os from "os";
import path from "path";
import { ControlRegistry } from "../control-registry.js";

const sampleYaml = `
- id: control.access.sso
  title: Enforce SSO and MFA
  category: security
  objective: Require SSO and MFA for privileged systems
  owner:
    primary: security@example.com
    backup: it@example.com
  check:
    type: automated
    script: scripts/check-sso.sh
  schedule:
    frequencyMinutes: 60
    toleranceMinutes: 30
  rtoMinutes: 240
  evidence:
    path: ./artifacts
    retentionDays: 90
    ttlDays: 14
    signer: security-bot
  tags:
    - soc2
    - access
`;

describe("ControlRegistry", () => {
  it("validates and normalizes YAML definitions", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-"));
    const filePath = path.join(dir, "controls.yaml");
    await fs.writeFile(filePath, sampleYaml);

    const registry = await ControlRegistry.fromYaml(filePath);
    const control = registry.get("control.access.sso");
    expect(control).toBeDefined();
    expect(control?.evidence.path.startsWith(dir)).toBe(true);
  });

  it("rejects invalid owner emails", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-"));
    const filePath = path.join(dir, "controls.yaml");
    await fs.writeFile(filePath, sampleYaml.replace("security@example.com", "not-an-email"));

    await expect(ControlRegistry.fromYaml(filePath)).rejects.toThrow("Invalid email");
  });
});

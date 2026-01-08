import fs from "fs";
import path from "path";
const golden = fs.readFileSync(path.join(__dirname, "..", "audit.golden.graphql"), "utf8");

test("audit golden contains recordAudit mutation", () => {
  expect(golden).toContain("recordAudit");
});

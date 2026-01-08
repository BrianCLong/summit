const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const cli = path.join(__dirname, "index.js");
const tmp = path.join(__dirname, "__tmp.yml");

function cleanup() {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}

test("cli validates correct rule", () => {
  fs.writeFileSync(
    tmp,
    [
      "name: Test",
      'when: {"any":[{"cypher":"RETURN 1"}]}',
      'then: {"create_alert":{"severity":"high"}}',
      "",
    ].join("\n")
  );
  const output = execFileSync("node", [cli, "validate", tmp], {
    encoding: "utf8",
    stdio: "pipe",
  });
  assert.match(output, /Rule is valid/);
  cleanup();
});

test("cli reports errors for invalid rule", () => {
  fs.writeFileSync(tmp, 'name: Test\nwhen: {}\nthen: {"create_alert":{}}\n');
  assert.throws(() => {
    execFileSync("node", [cli, "validate", tmp], {
      encoding: "utf8",
      stdio: "pipe",
    });
  });
  cleanup();
});

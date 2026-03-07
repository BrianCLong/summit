import fs from "fs";
import path from "path";
const golden = fs.readFileSync(path.join(__dirname, "..", "auth.golden.graphql"), "utf8");

test("auth golden has login and me", () => {
  expect(golden).toContain("login");
  expect(golden).toContain("me: TokenInfo!");
});

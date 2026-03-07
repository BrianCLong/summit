import { test as base, expect } from "@playwright/test";
import { authFixtures, AuthFixtures } from "./auth";
import { osintFixtures, OsintFixtures } from "./osint-fixtures";

// Combine fixtures
// We explicitly type the extended test so consumers get proper types
export const test = base.extend<AuthFixtures & OsintFixtures>({
  ...authFixtures,
  ...osintFixtures,
});

export { expect };

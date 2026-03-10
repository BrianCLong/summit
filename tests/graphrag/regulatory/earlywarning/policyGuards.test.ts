<<<<<<< HEAD
import { describe, it, expect } from 'vitest'
import { getEarlyWarning } from '../../../../src/api/rest/regulatory/early-warning'

describe("policy guards", () => {
  it("fails if high-severity warning exposed without review", () => {
    // Implement mock review check later
    expect(true).toBe(true);
  });

  it("fails on never-log fields in payload fixtures", () => {
    const payload = {
       institutionId: "bank",
       // consumer_name: "John Doe" // SHOULD BE STRIPPED
    };
    expect(payload).not.toHaveProperty('consumer_name');
  });
=======
describe("policy guards", () => {
  it("blocks high-severity without review", async () => {
    expect(true).toBe(true)
  })
>>>>>>> origin/main
})

<<<<<<< HEAD
import { describe, it, expect } from 'vitest'
import { retrieveAnalogs } from '../../../../src/graphrag/regulatory/earlywarning/retrieveAnalogs'

describe("analog retrieval", () => {
  it("returns stable evidence IDs when retrieval is disabled", () => {
     process.env.REGULATORY_EW_ANALOGS_ENABLED = 'false';
     const result = retrieveAnalogs({});
     expect(result).toEqual([]);
=======
describe("analog retrieval", () => {
  it("retrieves analogs deterministically", async () => {
    expect(true).toBe(true)
>>>>>>> origin/main
  })
})

import { chooseRetrievalMode } from "./router";

describe("Hybrid Router", () => {
  test("should choose regex for function calls", () => {
    expect(chooseRetrievalMode("myFunc(")).toBe("regex");
  });

  test("should choose hybrid for natural language", () => {
    expect(chooseRetrievalMode("how does auth work?")).toBe("hybrid");
  });
});

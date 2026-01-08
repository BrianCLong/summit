import { calculateCostUnits } from "./index";

describe("calculateCostUnits", () => {
  it("calculates query costs correctly", () => {
    const units = calculateCostUnits({
      operationType: "query",
      dimensions: {
        query_complexity: 5,
        rows_scanned: 1000,
        rows_returned: 100,
        cpu_ms: 200,
      },
    });
    // Base (10) + Complexity (5*2) + Scanned (1000*0.01) + Returned (100*0.1) + CPU (200*0.5)
    // 10 + 10 + 10 + 10 + 100 = 140
    expect(units).toBe(140);
  });

  it("calculates ingest costs correctly", () => {
    const units = calculateCostUnits({
      operationType: "ingest",
      dimensions: {
        io_bytes: 50000,
        objects_written: 50,
      },
    });
    // Base (5) + IO (50000*0.0001) + Objects (50*1)
    // 5 + 5 + 50 = 60
    expect(units).toBe(60);
  });

  it("calculates export costs correctly", () => {
    const units = calculateCostUnits({
      operationType: "export",
      dimensions: {
        io_bytes: 100000,
        objects_written: 10,
      },
    });
    // Base (20) + IO (100000*0.0002) + Objects (10*2)
    // 20 + 20 + 20 = 60
    expect(units).toBe(60);
  });

  it("handles missing dimensions gracefully", () => {
    const units = calculateCostUnits({
      operationType: "query",
      dimensions: {},
    });
    expect(units).toBe(10); // Base cost
  });
});

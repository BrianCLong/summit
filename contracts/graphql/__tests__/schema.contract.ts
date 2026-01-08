import fs from "node:fs";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { printSchema } from "graphql";
import typeDefs from "../../schema.graphql";

test("GraphQL schema contract (N-1, N-2)", () => {
  const current = printSchema(makeExecutableSchema({ typeDefs }));
  const baselines = ["schema.N-1.graphql", "schema.N-2.graphql"].filter((f) =>
    fs.existsSync(`contracts/graphql/${f}`)
  );
  for (const b of baselines) {
    const baseline = fs.readFileSync(`contracts/graphql/${b}`, "utf8");
    expect(current).toBe(baseline);
  }
});

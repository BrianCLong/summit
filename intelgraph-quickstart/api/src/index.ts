import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { getContextFromReq } from "./auth";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req }) => getContextFromReq(req),
  })
);

// test-only Cypher proxy used by k6 load script
app.post("/test/cypher", async (req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(404).end();
  const { getSession } = await import("./db/neo4j");
  const s = getSession();
  try {
    const r = await s.run(req.body.cypher);
    res.json({ records: r.records.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  } finally {
    await s.close();
  }
});

app.listen(4000, () => console.log("API on http://localhost:4000/graphql"));

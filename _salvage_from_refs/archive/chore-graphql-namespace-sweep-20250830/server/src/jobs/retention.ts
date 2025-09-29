import { runCypher } from "../graph/neo4j";
export async function purgeOldSuggestions(days=90){
  await runCypher(`
    MATCH (s:AISuggestion)
    WHERE datetime(s.createdAt) < datetime() - duration({days:$days})
    DETACH DELETE s
  `,{days});
}

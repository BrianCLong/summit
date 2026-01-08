const { request, gql } = require("graphql-request");

const GET_DEDUPLICATION_CANDIDATES = gql`
  query GetDeduplicationCandidates($threshold: Float) {
    deduplicationCandidates(threshold: $threshold) {
      entityA {
        id
      }
    }
  }
`;

async function main() {
  const endpoint = "http://localhost:4000/graphql";
  const variables = {
    threshold: 0.95, // A high threshold for CI
  };

  try {
    const data = await request(endpoint, GET_DEDUPLICATION_CANDIDATES, variables);
    if (data.deduplicationCandidates.length > 0) {
      console.error("Error: High-confidence duplicate entities found.");
      console.error(data.deduplicationCandidates);
      process.exit(1);
    } else {
      console.log("No high-confidence duplicates found.");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error checking for duplicates:", error);
    process.exit(1);
  }
}

main();

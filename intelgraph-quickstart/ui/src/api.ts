export async function gql(query: string, variables?: any) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant": "demo-tenant",
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

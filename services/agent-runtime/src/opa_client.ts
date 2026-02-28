export async function evaluate(input: any) {
  try {
    const response = await fetch("http://localhost:8181/v1/data/runtime/agent_runtime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input })
    });
    return response.json();
  } catch (error) {
    console.error("Failed to evaluate OPA policy", error);
    return { result: { deny: ["OPA policy evaluation failed"] } };
  }
}

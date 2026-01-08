exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Simulate some work
  const start = Date.now();
  while (Date.now() - start < 100) {}

  // Simulate random error for testing error handling
  if (event.force_error) {
    throw new Error("Forced error");
  }

  return {
    statusCode: 200,
    body: JSON.stringify("Hello from Hardened Lambda!"),
  };
};

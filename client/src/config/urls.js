// Default configuration for local development.
// In a real environment, this would be populated by environment variables.

export function getGraphqlHttpUrl() {
  return '/graphql';
}

export function getGraphqlWsUrl() {
  // Create a WebSocket URL from the current window location
  const protocol = window.location.protocol === 'https' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/graphql`;
}

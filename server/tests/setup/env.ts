const ensure = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

ensure('NODE_ENV', 'test');
ensure('SKIP_AI_ROUTES', '1');
ensure('SKIP_GRAPHQL', '1');
ensure('SKIP_WEBHOOKS', '1');
ensure('SKIP_JWT_ROTATION', 'true');
ensure('NO_NETWORK_LISTEN', 'true');

export {};

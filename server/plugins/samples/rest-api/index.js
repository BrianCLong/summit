const DEFAULT_BASE_URL = 'https://jsonplaceholder.typicode.com';

function buildUrl(baseUrl, resource, id, query) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedResource = resource.startsWith('/') ? resource.slice(1) : resource;
  const idSegment = id ? `/${id}` : '';
  const queryString = query ? new URLSearchParams(query).toString() : '';
  return queryString
    ? `${normalizedBase}/${normalizedResource}${idSegment}?${queryString}`
    : `${normalizedBase}/${normalizedResource}${idSegment}`;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

module.exports = {
  metadata: {
    name: 'rest-api-sample',
    version: '1.0.0',
  },
  async execute({ inputs, context, config }) {
    const logger = context.logger;
    const baseUrl = (config && config.baseUrl) || context.env.SAMPLE_REST_API_URL || DEFAULT_BASE_URL;
    const resource = (inputs && inputs.resource) || 'todos';
    const id = inputs && inputs.id;
    const query = (config && config.query) || undefined;
    const url = buildUrl(baseUrl, resource, id, query);

    const headers = Object.assign({ Accept: 'application/json' }, (config && config.headers) || {});
    if (context.env.SAMPLE_REST_API_TOKEN && !headers.Authorization) {
      headers.Authorization = `Bearer ${context.env.SAMPLE_REST_API_TOKEN}`;
    }

    logger.info('Issuing REST API request', { url });
    const response = await context.fetch(url, {
      method: (config && config.method) || 'GET',
      headers,
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      logger.warn('REST API request failed', { status: response.status, url });
      const error = new Error(`Request to ${url} failed with status ${response.status}`);
      error.details = { status: response.status, body };
      throw error;
    }

    if (context.cache) {
      await context.cache.set('last-status', response.status, 300);
    }

    const cachedStatus = context.cache ? await context.cache.get('last-status') : undefined;

    logger.info('REST API request completed', { status: response.status });
    return {
      status: response.status,
      data: body,
      cachedStatus,
      source: url,
    };
  },
};

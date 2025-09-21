import http from 'k6/http';

export function gql(url, query, variables, headers) {
  const payload = JSON.stringify({ query, variables });
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers || {});
  return http.post(url, payload, { headers: h });
}


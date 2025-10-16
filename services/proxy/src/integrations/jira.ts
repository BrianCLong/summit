import fetch from 'node-fetch';

export async function createJiraIssue({
  baseUrl,
  email,
  apiToken,
  projectKey,
  summary,
  description,
}: any) {
  const url = `${baseUrl}/rest/api/3/issue`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64'),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description,
        issuetype: { name: 'Task' },
      },
    }),
  });
  if (!res.ok)
    throw new Error(`Jira create failed: ${res.status} ${await res.text()}`);
  return res.json();
}

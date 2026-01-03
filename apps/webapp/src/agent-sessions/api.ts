import { SessionDetail, SessionSummary, ProjectCount } from './types';

const provider = 'claude';

export async function fetchSessions(params: { q?: string; project?: string }) {
  const query = new URLSearchParams();
  query.set('provider', provider);
  if (params.q) query.set('q', params.q);
  if (params.project) query.set('project', params.project);
  const resp = await fetch(`/api/agent-sessions?${query.toString()}`);
  if (!resp.ok) throw new Error('Failed to load sessions');
  const data = await resp.json();
  return data.sessions as SessionSummary[];
}

export async function fetchProjects() {
  const resp = await fetch(`/api/agent-sessions/projects/list?provider=${provider}`);
  if (!resp.ok) throw new Error('Failed to load projects');
  const data = await resp.json();
  return data.projects as ProjectCount[];
}

export async function fetchSessionDetail(sessionId: string) {
  const resp = await fetch(`/api/agent-sessions/${provider}/${sessionId}`);
  if (!resp.ok) throw new Error('Failed to load session');
  return (await resp.json()) as SessionDetail;
}

export function connectSessionStream(
  sessionId: string,
  onMessage: (detail: SessionDetail) => void,
) {
  const source = new EventSource(`/api/agent-sessions/${provider}/${sessionId}/stream`);
  source.addEventListener('session.reloaded', (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data) as SessionDetail;
      onMessage(payload);
    } catch (error) {
      console.error('Failed to parse session stream payload', error);
    }
  });
  return source;
}

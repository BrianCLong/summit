import React from 'react';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

const CASE_Q = gql`
  query ($id: ID!) {
    case(id: $id) {
      id
      name
      status
      priority
      summary
      createdAt
    }
    caseItems(caseId: $id) {
      id
      kind
      refId
      tags
      addedAt
    }
    caseTimeline(caseId: $id, limit: 100) {
      id
      at
      event
      payload
    }
  }
`;

export default function CaseDetail() {
  const { id } = useParams();
  const { data } = useQuery(CASE_Q, { variables: { id } });
  const c = data?.case;
  return (
    <div className="p-4" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <h2>{c?.name || 'Case'}</h2>
        <p>
          Status: {c?.status} • Priority: {c?.priority || '-'}
        </p>
        <h3>Timeline</h3>
        <ul>
          {(data?.caseTimeline || []).map((t: any) => (
            <li key={t.id}>
              {t.at} • {t.event} • {JSON.stringify(t.payload)}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ width: 420 }}>
        <h3>Evidence</h3>
        <ul>
          {(data?.caseItems || []).map((it: any) => (
            <li key={it.id}>
              {it.kind}: {it.refId}{' '}
              {it.tags?.length ? `[${it.tags.join(',')}]` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

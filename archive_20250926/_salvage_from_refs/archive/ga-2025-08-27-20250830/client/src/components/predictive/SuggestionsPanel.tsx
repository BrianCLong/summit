import React from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { toast } from 'react-hot-toast';

const SUGGEST = gql`
  query SuggestLinks($input: SuggestLinksInput!) {
    suggestLinks(input: $input) { generatedAt suggestions { id sourceId targetId score reasons { label weight } } }
  }`;
const ACCEPT = gql`mutation Accept($id: ID!){ acceptSuggestion(id:$id){ id status } }`;
const REJECT = gql`mutation Reject($id: ID!, $reason: String){ rejectSuggestion(id:$id, reason:$reason){ id status } }`;

export const SuggestionsPanel: React.FC<{ caseId: string; seeds: string[] }> = ({ caseId, seeds }) => {
  const { data, refetch, loading } = useQuery(SUGGEST, { variables: { input: { caseId, seedNodeIds: seeds, topK: 20 } } });
  const [accept] = useMutation(ACCEPT);
  const [reject] = useMutation(REJECT);

  const items = data?.suggestLinks?.suggestions || [];
  return (
    <div className="p-3 border rounded-xl">
      <div className="font-semibold mb-2">Predictive Links {loading ? '…' : ''}</div>
      <ul className="space-y-2">
        {items.map((s: any) => (
          <li key={s.id} className="p-2 rounded-md border flex items-center justify-between suggestion-item" data-source={s.sourceId} data-target={s.targetId}>
            <div>
              <div className="text-sm"> {s.sourceId} → {s.targetId} </div>
              <div className="text-xs opacity-70">score: {s.score.toFixed(3)} • {s.reasons.map((r:any)=>r.label).join(', ')}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => accept({ variables: { id: s.id } }).then(()=>toast.success('Link accepted')).then(()=>refetch())}>Accept</button>
              <button className="px-2 py-1 rounded bg-neutral-700 text-white" onClick={() => reject({ variables: { id: s.id, reason: 'not relevant' } }).then(()=>toast('Rejected')).then(()=>refetch())}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

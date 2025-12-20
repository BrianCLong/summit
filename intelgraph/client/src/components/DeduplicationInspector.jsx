import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_DEDUPLICATION_CANDIDATES, SUGGEST_MERGE } from '../graphql/deduplication';

const DeduplicationInspector = () => {
  const [candidates, setCandidates] = useState([]);
  const { loading, error, data } = useQuery(GET_DEDUPLICATION_CANDIDATES);
  const [suggestMerge] = useMutation(SUGGEST_MERGE);

  useEffect(() => {
    if (data) {
      setCandidates(data.deduplicationCandidates);
    }
  }, [data]);

  const handleMerge = async (sourceId, targetId) => {
    try {
      await suggestMerge({ variables: { sourceId, targetId } });
      // Remove the merged candidate from the list
      setCandidates(candidates.filter(c => c.entityA.id !== sourceId && c.entityB.id !== sourceId));
    } catch (err) {
      console.error('Error merging entities:', err);
      // In a real application, we would show a notification to the user
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return (
    <div>
      <h2>Deduplication Inspector</h2>
      {candidates.map(({ entityA, entityB, similarity, reasons }) => (
        <div key={`${entityA.id}-${entityB.id}`} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>Similarity: {(similarity * 100).toFixed(2)}%</h3>
          <p>Reasons: {reasons.join(', ')}</p>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <h4>{entityA.label}</h4>
              <p>{entityA.description}</p>
            </div>
            <div>
              <h4>{entityB.label}</h4>
              <p>{entityB.description}</p>
            </div>
          </div>
          <button onClick={() => handleMerge(entityA.id, entityB.id)}>Merge into {entityB.label}</button>
          <button onClick={() => handleMerge(entityB.id, entityA.id)}>Merge into {entityA.label}</button>
        </div>
      ))}
    </div>
  );
};

export default DeduplicationInspector;

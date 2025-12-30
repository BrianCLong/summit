import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_DEDUPLICATION_CANDIDATES, SUGGEST_MERGE } from "../graphql/deduplication";

const DeduplicationInspector = () => {
  const [candidates, setCandidates] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [mergeInFlight, setMergeInFlight] = useState(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const { loading, error, data } = useQuery(GET_DEDUPLICATION_CANDIDATES);
  const [suggestMerge] = useMutation(SUGGEST_MERGE);

  useEffect(() => {
    if (data) {
      setCandidates(data.deduplicationCandidates);
    }
  }, [data]);

  const handleMerge = async (sourceId, targetId) => {
    setFeedback(null);
    setMergeInFlight(`${sourceId}-${targetId}`);
    try {
      await suggestMerge({ variables: { sourceId, targetId } });
      // Remove the merged candidate from the list
      setCandidates((prev) =>
        prev.filter((c) => c.entityA.id !== sourceId && c.entityB.id !== sourceId)
      );
      setFeedback({ type: "success", message: "Merge completed successfully." });
    } catch (err) {
      console.error("Error merging entities:", err);
      setFeedback({ type: "error", message: "Merge failed. Please try again." });
    }
    setMergeInFlight(null);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const filteredCandidates = candidates.filter(
    ({ similarity }) => similarity >= similarityThreshold
  );

  const renderEntityDetails = (entity) => {
    const { id, label, description, attributes } = entity;

    return (
      <div>
        <h4>{label}</h4>
        <p>
          <strong>ID:</strong> {id}
        </p>
        <p>{description}</p>
        {attributes && Object.keys(attributes).length > 0 ? (
          <div>
            <p>
              <strong>Attributes</strong>
            </p>
            <ul>
              {Object.entries(attributes).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {String(value)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <h2>Deduplication Inspector</h2>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="similarity-threshold">
          Similarity threshold: {(similarityThreshold * 100).toFixed(0)}%
        </label>
        <input
          id="similarity-threshold"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={similarityThreshold}
          onChange={(event) => setSimilarityThreshold(Number(event.target.value))}
          aria-label="Similarity threshold"
        />
      </div>
      {feedback ? (
        <div role="alert" style={{ color: feedback.type === "error" ? "red" : "green" }}>
          {feedback.message}
        </div>
      ) : null}
      {filteredCandidates.map(({ entityA, entityB, similarity, reasons }) => (
        <div
          key={`${entityA.id}-${entityB.id}`}
          style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}
        >
          <h3>Similarity: {(similarity * 100).toFixed(2)}%</h3>
          <p>Reasons: {reasons.join(", ")}</p>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {renderEntityDetails(entityA)}
            {renderEntityDetails(entityB)}
          </div>
          <button
            onClick={() => handleMerge(entityA.id, entityB.id)}
            disabled={mergeInFlight === `${entityA.id}-${entityB.id}`}
          >
            {mergeInFlight === `${entityA.id}-${entityB.id}`
              ? "Merging..."
              : `Merge into ${entityB.label}`}
          </button>
          <button
            onClick={() => handleMerge(entityB.id, entityA.id)}
            disabled={mergeInFlight === `${entityB.id}-${entityA.id}`}
          >
            {mergeInFlight === `${entityB.id}-${entityA.id}`
              ? "Merging..."
              : `Merge into ${entityA.label}`}
          </button>
        </div>
      ))}
      {filteredCandidates.length === 0 ? <p>No candidates match the current threshold.</p> : null}
    </div>
  );
};

export default DeduplicationInspector;

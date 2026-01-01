import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_DEDUPLICATION_CANDIDATES, SUGGEST_MERGE } from "../graphql/deduplication";

const DeduplicationInspector = () => {
  const [candidates, setCandidates] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [mergeInFlight, setMergeInFlight] = useState(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [expandedDetails, setExpandedDetails] = useState(new Set());
  const { loading, error, data } = useQuery(GET_DEDUPLICATION_CANDIDATES);
  const [suggestMerge] = useMutation(SUGGEST_MERGE);

  const toggleDetails = (pairId) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(pairId)) {
      newExpanded.delete(pairId);
    } else {
      newExpanded.add(pairId);
    }
    setExpandedDetails(newExpanded);
  };

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
      setFeedback({
        type: "success",
        message: "Merge completed successfully.",
        details: `Entities ${sourceId} and ${targetId} have been merged.`,
      });

      // Emit success event for observability
      if (window.analytics) {
        window.analytics.track("entity_merge_success", {
          sourceId,
          targetId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error merging entities:", err);

      // Determine error type and provide actionable guidance
      let errorMessage = "Merge failed. ";
      let errorDetails = "";
      let retryable = true;

      if (err.networkError) {
        errorMessage += "Network connection issue detected.";
        errorDetails = "Please check your internet connection and try again.";
      } else if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        const graphQLError = err.graphQLErrors[0];
        errorMessage += "Validation error.";
        errorDetails =
          graphQLError.message || "The entities cannot be merged due to data constraints.";
        retryable = false;
      } else if (err.message && err.message.includes("timeout")) {
        errorMessage += "Request timed out.";
        errorDetails = "The operation took too long. Please try again.";
      } else {
        errorMessage += "An unexpected error occurred.";
        errorDetails = err.message || "Please try again or contact support if the issue persists.";
      }

      setFeedback({
        type: "error",
        message: errorMessage,
        details: errorDetails,
        retryable,
        sourceId,
        targetId,
      });

      // Emit error event for observability
      if (window.analytics) {
        window.analytics.track("entity_merge_error", {
          sourceId,
          targetId,
          errorType: err.networkError ? "network" : err.graphQLErrors ? "validation" : "unknown",
          errorMessage: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setMergeInFlight(null);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const filteredCandidates = candidates.filter(
    ({ similarity }) => similarity >= similarityThreshold
  );

  const getAttributeDiff = (entityA, entityB) => {
    const attrsA = entityA.attributes || {};
    const attrsB = entityB.attributes || {};
    const allKeys = new Set([...Object.keys(attrsA), ...Object.keys(attrsB)]);

    const diff = [];
    for (const key of allKeys) {
      const valueA = attrsA[key];
      const valueB = attrsB[key];
      const isDifferent = valueA !== valueB;

      diff.push({
        key,
        valueA,
        valueB,
        isDifferent,
        inBothEntities: key in attrsA && key in attrsB,
        onlyInA: key in attrsA && !(key in attrsB),
        onlyInB: !(key in attrsA) && key in attrsB,
      });
    }

    return diff;
  };

  const renderSimilarityBreakdown = (similarity, reasons, entityA, entityB) => {
    // Calculate component scores (approximation based on reasons)
    const hasHighTextSimilarity = reasons.includes("High text similarity");
    const hasNeighborOverlap = reasons.includes("Significant neighbor overlap");
    const hasSameSource = reasons.includes("Same source");

    return (
      <div style={{ fontSize: "0.9em", marginTop: "8px" }}>
        <strong>Confidence Score Breakdown:</strong>
        <ul style={{ marginTop: "4px", paddingLeft: "20px" }}>
          <li>
            Text Similarity (60% weight): {hasHighTextSimilarity ? "High" : "Moderate"}
            {hasHighTextSimilarity && " ✓"}
          </li>
          <li>
            Topology Similarity (30% weight):{" "}
            {hasNeighborOverlap ? "Significant overlap" : "Low overlap"}
            {hasNeighborOverlap && " ✓"}
          </li>
          <li>
            Provenance (10% weight): {hasSameSource ? "Same source" : "Different sources"}
            {hasSameSource && " ✓"}
          </li>
        </ul>
      </div>
    );
  };

  const renderEntityComparison = (entityA, entityB, pairId, isExpanded, similarity, reasons) => {
    const attributeDiff = getAttributeDiff(entityA, entityB);
    const differentAttributes = attributeDiff.filter((attr) => attr.isDifferent);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          {/* Entity A */}
          <div
            style={{
              flex: 1,
              marginRight: "10px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0" }}>{entityA.label}</h4>
            <p style={{ fontSize: "0.85em", color: "#666", margin: "4px 0" }}>
              <strong>ID:</strong> {entityA.id}
            </p>
            {entityA.source && (
              <p style={{ fontSize: "0.85em", color: "#666", margin: "4px 0" }}>
                <strong>Source:</strong> {entityA.source}
              </p>
            )}
            <p style={{ fontSize: "0.9em", marginTop: "8px" }}>{entityA.description}</p>
          </div>

          {/* Entity B */}
          <div
            style={{
              flex: 1,
              marginLeft: "10px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0" }}>{entityB.label}</h4>
            <p style={{ fontSize: "0.85em", color: "#666", margin: "4px 0" }}>
              <strong>ID:</strong> {entityB.id}
            </p>
            {entityB.source && (
              <p style={{ fontSize: "0.85em", color: "#666", margin: "4px 0" }}>
                <strong>Source:</strong> {entityB.source}
              </p>
            )}
            <p style={{ fontSize: "0.9em", marginTop: "8px" }}>{entityB.description}</p>
          </div>
        </div>

        {/* Toggle detailed view button */}
        <button
          onClick={() => toggleDetails(pairId)}
          style={{
            padding: "6px 12px",
            marginBottom: "12px",
            backgroundColor: "#e0e0e0",
            border: "1px solid #bdbdbd",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9em",
          }}
        >
          {isExpanded ? "▼ Hide Details" : "▶ Show Detailed Comparison"}
        </button>

        {isExpanded && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              backgroundColor: "#fafafa",
              borderRadius: "4px",
            }}
          >
            {/* Similarity breakdown */}
            {renderSimilarityBreakdown(similarity, reasons, entityA, entityB)}

            {/* Attribute diff */}
            {attributeDiff.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <strong>Attribute Comparison:</strong>
                {differentAttributes.length > 0 && (
                  <p style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "4px" }}>
                    {differentAttributes.length} attribute(s) differ
                  </p>
                )}
                <table
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    borderCollapse: "collapse",
                    fontSize: "0.85em",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#e0e0e0" }}>
                      <th
                        style={{ padding: "6px", textAlign: "left", border: "1px solid #bdbdbd" }}
                      >
                        Attribute
                      </th>
                      <th
                        style={{ padding: "6px", textAlign: "left", border: "1px solid #bdbdbd" }}
                      >
                        {entityA.label}
                      </th>
                      <th
                        style={{ padding: "6px", textAlign: "left", border: "1px solid #bdbdbd" }}
                      >
                        {entityB.label}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributeDiff.map((attr) => (
                      <tr
                        key={attr.key}
                        style={{
                          backgroundColor: attr.isDifferent ? "#fff3e0" : "transparent",
                        }}
                      >
                        <td
                          style={{ padding: "6px", border: "1px solid #bdbdbd", fontWeight: "500" }}
                        >
                          {attr.key}
                          {attr.isDifferent && " ⚠️"}
                        </td>
                        <td style={{ padding: "6px", border: "1px solid #bdbdbd" }}>
                          {attr.onlyInA && <em style={{ color: "#666" }}>(unique)</em>}
                          {attr.valueA !== undefined ? (
                            String(attr.valueA)
                          ) : (
                            <em style={{ color: "#999" }}>—</em>
                          )}
                        </td>
                        <td style={{ padding: "6px", border: "1px solid #bdbdbd" }}>
                          {attr.onlyInB && <em style={{ color: "#666" }}>(unique)</em>}
                          {attr.valueB !== undefined ? (
                            String(attr.valueB)
                          ) : (
                            <em style={{ color: "#999" }}>—</em>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Relationship info */}
            {(entityA.relationships?.length > 0 || entityB.relationships?.length > 0) && (
              <div style={{ marginTop: "16px" }}>
                <strong>Connected Entities:</strong>
                <div style={{ display: "flex", marginTop: "8px", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85em", fontWeight: "500" }}>{entityA.label}:</p>
                    <p style={{ fontSize: "0.85em", color: "#666" }}>
                      {entityA.relationships?.length || 0} connection(s)
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85em", fontWeight: "500" }}>{entityB.label}:</p>
                    <p style={{ fontSize: "0.85em", color: "#666" }}>
                      {entityB.relationships?.length || 0} connection(s)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Audit trail placeholder */}
            <div
              style={{
                marginTop: "16px",
                padding: "8px",
                backgroundColor: "#e3f2fd",
                borderRadius: "4px",
              }}
            >
              <p style={{ fontSize: "0.85em", color: "#1565c0", margin: 0 }}>
                💡 <strong>Audit Trail:</strong> View full provenance and modification history in
                the entity detail page.
              </p>
            </div>
          </div>
        )}
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
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: `2px solid ${feedback.type === "error" ? "#d32f2f" : "#388e3c"}`,
            backgroundColor: feedback.type === "error" ? "#ffebee" : "#e8f5e9",
            color: feedback.type === "error" ? "#c62828" : "#2e7d32",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {feedback.type === "error" ? "⚠️ " : "✓ "}
            {feedback.message}
          </div>
          {feedback.details && (
            <div style={{ fontSize: "0.9em", marginTop: "4px" }}>{feedback.details}</div>
          )}
          {feedback.type === "error" && feedback.retryable && (
            <button
              onClick={() => handleMerge(feedback.sourceId, feedback.targetId)}
              style={{
                marginTop: "8px",
                padding: "6px 12px",
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.9em",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#1565c0")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#1976d2")}
            >
              Retry Merge
            </button>
          )}
          <button
            onClick={() => setFeedback(null)}
            style={{
              marginLeft: feedback.retryable ? "8px" : "0px",
              marginTop: "8px",
              padding: "6px 12px",
              backgroundColor: "transparent",
              color: feedback.type === "error" ? "#c62828" : "#2e7d32",
              border: `1px solid ${feedback.type === "error" ? "#c62828" : "#2e7d32"}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9em",
            }}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {filteredCandidates.map(({ entityA, entityB, similarity, reasons }) => {
        const pairId = `${entityA.id}-${entityB.id}`;
        const isExpanded = expandedDetails.has(pairId);

        return (
          <div
            key={pairId}
            style={{
              border: "2px solid #e0e0e0",
              margin: "16px 0",
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
                Similarity: {(similarity * 100).toFixed(2)}%
              </h3>
              <p style={{ margin: "4px 0", fontSize: "0.9em", color: "#666" }}>
                <strong>Match Reasons:</strong> {reasons.join(", ")}
              </p>
            </div>

            {renderEntityComparison(entityA, entityB, pairId, isExpanded, similarity, reasons)}

            <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
              <button
                onClick={() => handleMerge(entityA.id, entityB.id)}
                disabled={mergeInFlight === `${entityA.id}-${entityB.id}`}
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    mergeInFlight === `${entityA.id}-${entityB.id}` ? "#bdbdbd" : "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    mergeInFlight === `${entityA.id}-${entityB.id}` ? "not-allowed" : "pointer",
                  fontSize: "0.95em",
                  fontWeight: "500",
                }}
                onMouseOver={(e) => {
                  if (!mergeInFlight) e.target.style.backgroundColor = "#1565c0";
                }}
                onMouseOut={(e) => {
                  if (!mergeInFlight) e.target.style.backgroundColor = "#1976d2";
                }}
              >
                {mergeInFlight === `${entityA.id}-${entityB.id}`
                  ? "⏳ Merging..."
                  : `← Merge into ${entityB.label}`}
              </button>
              <button
                onClick={() => handleMerge(entityB.id, entityA.id)}
                disabled={mergeInFlight === `${entityB.id}-${entityA.id}`}
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    mergeInFlight === `${entityB.id}-${entityA.id}` ? "#bdbdbd" : "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    mergeInFlight === `${entityB.id}-${entityA.id}` ? "not-allowed" : "pointer",
                  fontSize: "0.95em",
                  fontWeight: "500",
                }}
                onMouseOver={(e) => {
                  if (!mergeInFlight) e.target.style.backgroundColor = "#1565c0";
                }}
                onMouseOut={(e) => {
                  if (!mergeInFlight) e.target.style.backgroundColor = "#1976d2";
                }}
              >
                {mergeInFlight === `${entityB.id}-${entityA.id}`
                  ? "⏳ Merging..."
                  : `Merge into ${entityA.label} →`}
              </button>
            </div>
          </div>
        );
      })}
      {filteredCandidates.length === 0 ? <p>No candidates match the current threshold.</p> : null}
    </div>
  );
};

export default DeduplicationInspector;

import React, { useEffect, useState } from 'react';

// Interfaces for our state
interface TrustRiskSummary {
  riskDistribution: { LOW: number; MEDIUM: number; HIGH: number };
  highRiskAlertsHandled: number;
  topNarrativeRisks: string[];
}

interface GovernanceSummary {
  tier2And3Decisions: number;
  averageApprovalTimeMs: number;
  majorCategories: string[];
  message?: string;
}

interface AutomationSafetySummary {
  actionsByClass: Record<string, number>;
  councilApprovalsRequired: number;
  autoApprovals: number;
  message?: string;
}

export function TrustPortal() {
  const [riskData, setRiskData] = useState<TrustRiskSummary | null>(null);
  const [govData, setGovData] = useState<GovernanceSummary | null>(null);
  const [autoData, setAutoData] = useState<AutomationSafetySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real application, these would be fetch calls to the respective endpoints:
    // fetch('/trust/v1/risk-summary', { headers: { Authorization: `Bearer ${token}` }})
    // For this demonstration, we are mocking the resolved API responses locally to
    // simulate the final state without requiring a running backend.

    setRiskData({
      riskDistribution: { LOW: 1, MEDIUM: 1, HIGH: 1 },
      highRiskAlertsHandled: 1,
      topNarrativeRisks: ['disinformation', 'spam']
    });

    setGovData({
      tier2And3Decisions: 1,
      averageApprovalTimeMs: 5000,
      majorCategories: ['exports', 'ontology']
    });

    setAutoData({
      actionsByClass: { watchlist: 1, report: 1 },
      councilApprovalsRequired: 1,
      autoApprovals: 1
    });

  }, []);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded">Error loading Trust Portal: {error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 font-sans">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Summit Trust & Governance Portal</h1>
        <p className="mt-2 text-gray-600">
          A read-only, sanitized summary of our narrative risk posture, automated guardrails, and human-in-the-loop governance oversight.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Risk Posture */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Narrative & Persona Risk Posture</h2>
          <p className="text-sm text-gray-600 mb-6">
            How Summit detects and classifies narrative threats without exposing PII.
          </p>
          {riskData ? (
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500 block">High Risk Handled</span>
                <span className="text-2xl font-bold text-red-600">{riskData.highRiskAlertsHandled}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 block">Top Patterns Detected</span>
                <ul className="list-disc pl-5 mt-1 text-sm text-gray-700">
                  {riskData.topNarrativeRisks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="animate-pulse h-24 bg-gray-100 rounded"></div>
          )}
        </section>

        {/* Governance Workload */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Governance & Approvals</h2>
          <p className="text-sm text-gray-600 mb-6">
            How human councils govern high-risk AI changes and enforce controls.
          </p>
          {govData ? (
            govData.message ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">{govData.message}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500 block">Tier 2/3 Decisions</span>
                  <span className="text-2xl font-bold text-indigo-600">{govData.tier2And3Decisions}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">Categories Governed</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {govData.majorCategories.map((cat) => (
                      <span key={cat} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="animate-pulse h-24 bg-gray-100 rounded"></div>
          )}
        </section>

        {/* Automation Safety */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Automation Safety</h2>
          <p className="text-sm text-gray-600 mb-6">
            How autonomous actions are constrained and subjected to manual approval.
          </p>
          {autoData ? (
            autoData.message ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">{autoData.message}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline border-b pb-2">
                  <span className="text-sm text-gray-600">Auto Approvals</span>
                  <span className="text-xl font-bold text-green-600">{autoData.autoApprovals}</span>
                </div>
                <div className="flex justify-between items-baseline border-b pb-2">
                  <span className="text-sm text-gray-600">Council Required</span>
                  <span className="text-xl font-bold text-amber-600">{autoData.councilApprovalsRequired}</span>
                </div>
              </div>
            )
          ) : (
            <div className="animate-pulse h-24 bg-gray-100 rounded"></div>
          )}
        </section>
      </div>
    </div>
  );
}

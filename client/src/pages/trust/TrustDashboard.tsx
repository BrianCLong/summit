import React, { useState, useEffect } from 'react';
import { TrustSummary } from './types';
import { TrustStatusCard } from './components/TrustStatusCard';
import { MetricCard } from './components/MetricCard';
import { DetailsDrawer } from './components/DetailsDrawer';
import { DataTable } from './components/Tables';

// Icons
const ShieldCheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const DocumentSearchIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const CheckCircleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ExclamationCircleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

// Mock API Call
const fetchTrustSummary = async (env: string, release: string): Promise<TrustSummary> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    env: env,
    release: release,
    updatedAt: new Date().toISOString(),
    overall: {
      status: "WARN",
      score: 88,
      blockers: [
        "Provenance coverage below threshold (95%)",
        "Missing 12 audit log spans in last 24h"
      ]
    },
    build: {
      reproducible: true,
      artifactSignedPct: 100,
      sbomPresentPct: 100,
      slsaLevel: "SLSA3"
    },
    provenance: {
      coveragePct: 92,
      unsignedEvents24h: 3,
      gapsTop: [
        { component: "auth-service", reason: "Missing build signature" },
        { component: "ml-worker", reason: "Unverified base image" }
      ]
    },
    policy: {
      compliancePct: 100,
      denials24h: 42,
      topDeniedActions: [
        { action: "s3:GetObject", count: 28 },
        { action: "iam:PassRole", count: 14 }
      ]
    },
    drift: {
      configDrift: true,
      driftItems: [
        { key: "redis.maxmemory", expected: "2gb", actual: "4gb" },
        { key: "feature.new_dashboard", expected: "false", actual: "true" }
      ]
    },
    audit: {
      appendOnly: true,
      verifierHealthy: true,
      missingSpans24h: 12
    }
  };
};

export default function TrustDashboard() {
  const [data, setData] = useState<TrustSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [env, setEnv] = useState('prod');
  const [release, setRelease] = useState('v1.7.0');

  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTrustSummary(env, release);
        setData(result);
      } catch (err) {
        setError("Failed to load trust data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [env, release]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 text-center max-w-md">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Trust Data</h2>
          <p className="text-gray-600">{error || "Unknown error occurred"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ShieldCheckIcon className="w-8 h-8 mr-2 text-blue-600" />
              Trust Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Continuous validation for air-gapped & sovereign deployments. Last updated: {new Date(data.updatedAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex space-x-4">
            <div className="flex flex-col">
              <label htmlFor="env-select" className="text-xs font-medium text-gray-500 mb-1">Environment</label>
              <select
                id="env-select"
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
                <option value="dev">Dev</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
                <option value="airgap-dmz">Air-Gap DMZ</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="release-select" className="text-xs font-medium text-gray-500 mb-1">Release</label>
              <select
                id="release-select"
                value={release}
                onChange={(e) => setRelease(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
                <option value="v1.7.0">v1.7.0</option>
                <option value="v1.6.5">v1.6.5</option>
                <option value="v1.6.0">v1.6.0</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
               <button
                 className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                 onClick={() => {
                   // Mock export
                   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `trust-packet-${data.env}-${data.release}.json`;
                   a.click();
                 }}
               >
                 Export JSON
               </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main Status */}
          <div className="col-span-12">
            <TrustStatusCard overall={data.overall} />
          </div>

          {/* 1. Build Integrity */}
          <div className="col-span-12 md:col-span-4 h-full">
             <MetricCard
              title="Build Integrity"
              icon={<DocumentSearchIcon />}
              status={data.build.reproducible ? 'PASS' : 'FAIL'}
              primaryMetric={`${data.build.artifactSignedPct}% Signed`}
              onViewDetails={() => setActiveDrawer('build')}
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Reproducible Build</span>
                  <span className={data.build.reproducible ? "text-green-600" : "text-red-600"}>
                    {data.build.reproducible ? "Verified" : "Failed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SLSA Level</span>
                  <span className="font-medium text-gray-700">{data.build.slsaLevel || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SBOM Coverage</span>
                  <span className="font-medium text-gray-700">{data.build.sbomPresentPct}%</span>
                </div>
              </div>
            </MetricCard>
          </div>

          {/* 2. Provenance Coverage */}
          <div className="col-span-12 md:col-span-4 h-full">
            <MetricCard
              title="Provenance"
              icon={<ShieldCheckIcon />}
              status={data.provenance.coveragePct >= 95 ? 'PASS' : 'WARN'}
              primaryMetric={`${data.provenance.coveragePct}%`}
              trend="Coverage"
              onViewDetails={() => setActiveDrawer('provenance')}
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Unsigned Events (24h)</span>
                  <span className={data.provenance.unsignedEvents24h > 0 ? "text-yellow-600 font-medium" : "text-green-600"}>
                    {data.provenance.unsignedEvents24h}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Top Gap: <span className="font-medium text-gray-700">{data.provenance.gapsTop[0]?.component}</span>
                </div>
              </div>
            </MetricCard>
          </div>

          {/* 3. Policy Compliance */}
          <div className="col-span-12 md:col-span-4 h-full">
            <MetricCard
              title="Policy Compliance"
              icon={<CheckCircleIcon />}
              status={data.policy.compliancePct === 100 ? 'PASS' : 'FAIL'}
              primaryMetric={`${data.policy.compliancePct}%`}
              onViewDetails={() => setActiveDrawer('policy')}
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Denials (24h)</span>
                  <span className="font-medium text-gray-700">{data.policy.denials24h}</span>
                </div>
                 <div className="flex justify-between mt-1">
                   <span className="text-gray-500 text-xs truncate max-w-[150px]">
                     Top: {data.policy.topDeniedActions[0]?.action}
                   </span>
                   <span className="text-gray-700 text-xs">
                     {data.policy.topDeniedActions[0]?.count}x
                   </span>
                 </div>
              </div>
            </MetricCard>
          </div>

          {/* 4. Runtime Drift */}
          <div className="col-span-12 md:col-span-6 h-full">
            <MetricCard
              title="Configuration Drift"
              icon={<ExclamationCircleIcon />}
              status={data.drift.configDrift ? 'WARN' : 'PASS'}
              primaryMetric={data.drift.configDrift ? `${data.drift.driftItems.length} items` : 'No drift'}
              onViewDetails={() => setActiveDrawer('drift')}
            >
               {data.drift.configDrift ? (
                 <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                   Configuration has drifted from baseline.
                 </div>
               ) : (
                 <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                   Runtime matches approved baseline exactly.
                 </div>
               )}
            </MetricCard>
          </div>

          {/* 5. Audit Log Health */}
          <div className="col-span-12 md:col-span-6 h-full">
            <MetricCard
              title="Audit Health"
              icon={<DocumentSearchIcon />}
              status={data.audit.missingSpans24h === 0 ? 'PASS' : 'WARN'}
              primaryMetric={data.audit.missingSpans24h === 0 ? 'Healthy' : 'Needs Review'}
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Append Only</span>
                  <span className={data.audit.appendOnly ? "text-green-600" : "text-red-600"}>
                    {data.audit.appendOnly ? "Verified" : "Violated"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Missing Spans (24h)</span>
                  <span className={data.audit.missingSpans24h > 0 ? "text-yellow-600 font-medium" : "text-green-600"}>
                    {data.audit.missingSpans24h}
                  </span>
                </div>
              </div>
            </MetricCard>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <DetailsDrawer
        isOpen={activeDrawer === 'build'}
        onClose={() => setActiveDrawer(null)}
        title="Build Integrity Details"
      >
        <div className="space-y-6">
          <div>
             <h3 className="text-sm font-medium text-gray-900 mb-2">SBOMs Status</h3>
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <div className="flex justify-between mb-2">
                 <span className="text-sm text-gray-600">Core Services</span>
                 <span className="text-sm font-medium text-green-600">Present</span>
               </div>
               <div className="flex justify-between mb-2">
                 <span className="text-sm text-gray-600">UI Assets</span>
                 <span className="text-sm font-medium text-green-600">Present</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-sm text-gray-600">Worker Nodes</span>
                 <span className="text-sm font-medium text-green-600">Present</span>
               </div>
             </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Signatures</h3>
            <p className="text-sm text-gray-600">All OCI images have valid cosign signatures linked to the Fulcio root of trust or offline key pair.</p>
          </div>
        </div>
      </DetailsDrawer>

      <DetailsDrawer
        isOpen={activeDrawer === 'provenance'}
        onClose={() => setActiveDrawer(null)}
        title="Provenance Gaps"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            The following components have missing or incomplete provenance attestations, lowering the overall coverage score.
          </p>
          <DataTable
            columns={['Component', 'Reason']}
            data={data.provenance.gapsTop}
            renderRow={(item, idx) => (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.component}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.reason}</td>
              </>
            )}
          />
        </div>
      </DetailsDrawer>

      <DetailsDrawer
        isOpen={activeDrawer === 'policy'}
        onClose={() => setActiveDrawer(null)}
        title="Policy Denials (Last 24h)"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Actions denied by the default governance policy pack.
          </p>
          <DataTable
            columns={['Action', 'Count']}
            data={data.policy.topDeniedActions}
            renderRow={(item, idx) => (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono text-xs">{item.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.count}</td>
              </>
            )}
          />
        </div>
      </DetailsDrawer>

      <DetailsDrawer
        isOpen={activeDrawer === 'drift'}
        onClose={() => setActiveDrawer(null)}
        title="Configuration Drift"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-md mb-4 border border-yellow-200 text-yellow-800 text-sm">
            <strong>Action Required:</strong> Reconcile these differences by updating the declarative baseline or reverting the runtime changes.
          </div>
          <DataTable
            columns={['Key', 'Expected', 'Actual']}
            data={data.drift.driftItems}
            renderRow={(item, idx) => (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono text-xs">{item.key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{item.expected}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-mono text-xs font-bold">{item.actual}</td>
              </>
            )}
          />
        </div>
      </DetailsDrawer>
    </div>
  );
}

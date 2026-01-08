import React from "react";
import type { ProvenanceNode, SBOMNode, AttestationNode } from "../graphTypes";

interface Props {
  node: ProvenanceNode | null;
}

export const NodeDetailsPanel: React.FC<Props> = ({ node }) => {
  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Select a node in the graph to inspect provenance details.
      </div>
    );
  }

  if (node.type === "sbom") {
    const sbom = node as SBOMNode;
    return (
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg">SBOM</h3>
        <div className="text-xs text-gray-500">
          Generated at {new Date(node.timestamp).toLocaleString()}
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-1">Package</th>
                <th className="text-left p-1">Version</th>
                <th className="text-left p-1">License</th>
                <th className="text-left p-1">Vuln</th>
                <th className="text-left p-1">Severity</th>
              </tr>
            </thead>
            <tbody>
              {sbom.metadata.packages.map((p) => (
                <tr key={`${p.name}@${p.version}`} className="border-b">
                  <td className="p-1">{p.name}</td>
                  <td className="p-1">{p.version}</td>
                  <td className="p-1">{p.license ?? "—"}</td>
                  <td className="p-1">{p.vuln?.id ?? "—"}</td>
                  <td className="p-1">{p.vuln?.severity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (node.type === "attestation") {
    const att = node as AttestationNode;
    return (
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg">Build Attestation</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-gray-500">Builder</div>
            <div>{att.metadata.builder}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Runner</div>
            <div>{att.metadata.runner}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Commit</div>
            <div className="font-mono text-xs break-all">{att.metadata.commit}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Repo</div>
            <div>{att.metadata.repo}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Signature</div>
            <div>{att.metadata.signatureVerified ? "Verified ✅" : "Unverified ⚠️"}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-sm">
      <div className="font-semibold mb-1">Node</div>
      <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-64">
        {JSON.stringify(node, null, 2)}
      </pre>
    </div>
  );
};

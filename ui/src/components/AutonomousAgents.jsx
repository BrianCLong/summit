import React, { useEffect, useState } from 'react';

const query = `#graphql
  query AutonomousAgentPapers($limit: Int) {
    autonomousAgentPapers(limit: $limit) {
      sourceId
      paperTitle
      paperUrl
      paperHost
      publishedOrListedDate
      tags
      summaryBullets
      sourcePath
      sourceCommit
      extractedAt
    }
  }
`;

const Tag = ({ label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mr-2 mb-2">
    {label}
  </span>
);

const AutonomousAgents = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { limit: 25 } }),
        });
        const payload = await response.json();
        if (payload.errors) {
          setError(payload.errors.map((e) => e.message).join(', '));
        } else {
          setPapers(payload.data?.autonomousAgentPapers ?? []);
        }
      } catch (err) {
        setError(err && err.message ? err.message : 'Unable to load research feed');
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, []);

  if (loading) return <div className="p-4">Loading autonomous agent research…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Autonomous Agents Research</h2>
          <p className="text-sm text-gray-600">
            Latest papers ingested from the tmgthb/Autonomous-Agents feed with provenance.
          </p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
          Daily refresh
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {papers.map((paper) => (
          <article key={paper.sourceId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <a
                  className="text-lg font-semibold text-blue-700 hover:underline"
                  href={paper.paperUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {paper.paperTitle}
                </a>
                <p className="text-sm text-gray-600 mt-1">
                  {paper.paperHost || 'Unknown host'} · {paper.publishedOrListedDate || 'Undated'}
                </p>
              </div>
              <div className="text-xs text-gray-500 text-right">
                <div>Source: README path {paper.sourcePath}</div>
                <div>Commit: {paper.sourceCommit.slice(0, 7)}</div>
                <div>Extracted: {new Date(paper.extractedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap">
              {paper.tags?.map((tag) => (
                <Tag key={`${paper.sourceId}-${tag}`} label={tag} />
              ))}
            </div>

            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 mt-2">
              {paper.summaryBullets?.map((bullet, idx) => (
                <li key={`${paper.sourceId}-bullet-${idx}`}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AutonomousAgents;

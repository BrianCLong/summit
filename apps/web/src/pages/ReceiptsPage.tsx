import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ShieldCheck, Clock, FileJson, Link as LinkIcon, Download } from 'lucide-react';

const MOCK_RECEIPT = {
  id: 'RCPT-2026-02-12-XYZ',
  timestamp: '2026-02-12T14:30:00Z',
  actor: 'alice@example.com',
  action: 'approve',
  resource: 'REQ-101',
  policy_version: 'v1.2.3',
  decision: 'allow',
  signature: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  evidence_links: [
    { type: 'log', url: 'https://logs.example.com/123' },
    { type: 'ticket', url: 'https://jira.example.com/T-456' }
  ]
};

export default function ReceiptsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Provenance Receipt</h1>
          <p className="text-muted-foreground font-mono text-sm">{id || MOCK_RECEIPT.id}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-md text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export Bundle
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Verification Card */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6 flex items-start gap-4">
           <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
           <div>
             <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Cryptographically Verified</h3>
             <p className="text-green-700 dark:text-green-300 mt-1">
               This receipt is signed by the Switchboard Root CA. The signature is valid and the content has not been tampered with.
             </p>
             <div className="mt-2 font-mono text-xs text-green-800 break-all bg-green-100/50 p-2 rounded">
               {MOCK_RECEIPT.signature}
             </div>
           </div>
        </div>

        {/* Timeline / Provenance Chain */}
        <div className="bg-white dark:bg-zinc-900 border rounded-lg p-6 shadow-sm">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <Clock className="w-5 h-5" /> Provenance Chain
           </h3>
           <div className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-8">
             <div className="relative">
               <div className="absolute -left-[21px] top-1 w-3 h-3 bg-zinc-400 rounded-full ring-4 ring-white dark:ring-zinc-900"></div>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-muted-foreground">Request Created</span>
                 <span className="text-xs text-muted-foreground">2026-02-12 10:30:00 UTC</span>
               </div>
             </div>

             <div className="relative">
               <div className="absolute -left-[21px] top-1 w-3 h-3 bg-green-500 rounded-full ring-4 ring-white dark:ring-zinc-900"></div>
               <div className="flex flex-col">
                 <span className="font-medium">Action Approved</span>
                 <span className="text-sm text-zinc-600 dark:text-zinc-400">by {MOCK_RECEIPT.actor}</span>
                 <div className="mt-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded text-sm border">
                   <span className="font-semibold text-xs uppercase text-zinc-500 mb-1 block">Policy Version</span>
                   {MOCK_RECEIPT.policy_version}
                 </div>
               </div>
             </div>
           </div>
        </div>

        {/* Evidence Links */}
        <div className="bg-white dark:bg-zinc-900 border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5" /> Evidence Links
          </h3>
          <ul className="space-y-2">
            {MOCK_RECEIPT.evidence_links.map((link, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded border hover:bg-zinc-100 transition-colors">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {link.type === 'log' ? <FileText className="w-4 h-4 text-blue-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                  {link.type.toUpperCase()} Evidence
                </span>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  View External Source
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Raw JSON */}
        <div className="bg-zinc-900 text-zinc-100 rounded-lg p-6 font-mono text-xs overflow-x-auto shadow-sm">
          <h3 className="text-sm font-semibold mb-2 text-zinc-400 flex items-center gap-2">
            <FileJson className="w-4 h-4" /> Raw Receipt JSON
          </h3>
          <pre>{JSON.stringify(MOCK_RECEIPT, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
new file mode 100644

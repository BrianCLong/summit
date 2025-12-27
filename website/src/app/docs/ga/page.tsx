import gaDocs from "../../../../static/generated/ga-docs.json";

export const metadata = {
  title: "GA Documentation & Evidence Portal",
  description: "Governed documentation hub with auto-generated bundles from code comments, schemas, and runbooks.",
};

type DocEntry = {
  file: string;
  title: string;
  summary: string;
  snippet: string;
  kind: "codeCommentDocs" | "schemas" | "runbooks";
};

type Bundle = {
  generatedAt: string;
  codeCommentDocs: DocEntry[];
  schemas: DocEntry[];
  runbooks: DocEntry[];
};

const bundle = gaDocs as Bundle;

const manualDocs = [
  {
    title: "GA-Grade Documentation Suite",
    description: "Architecture, data flows, governance rationale, API highlights, and non-capability statements.",
    path: "docs/GA_DOCUMENTATION_PORTAL.md",
  },
  {
    title: "GA Control Evidence Bundle",
    description: "Requirement → control → test → artefact traceability across SOC 2, ISO 27001, and FedRAMP-aligned controls.",
    path: "docs/GA_CONTROL_EVIDENCE_BUNDLE.md",
  },
  {
    title: "Automated Generation Script",
    description: "Regenerates documentation bundles from code comments, schemas, and runbooks for the portal.",
    path: "website/scripts/generate-ga-docs.mjs",
  },
];

const sections: { title: string; description: string; entries: DocEntry[] }[] = [
  {
    title: "Code Comment Summaries",
    description: "Extracted docblocks and inline commentaries from core services and UI packages.",
    entries: bundle.codeCommentDocs.slice(0, 6),
  },
  {
    title: "Schemas",
    description: "JSON/YAML/GraphQL contracts that define the platform's canonical interfaces and lineage.",
    entries: bundle.schemas.slice(0, 6),
  },
  {
    title: "Runbooks",
    description: "Operational guides and drills that back SLOs, incident response, and production readiness.",
    entries: bundle.runbooks.slice(0, 6),
  },
];

function Card({ title, description, path }: { title: string; description: string; path: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-emerald-400">Manual</p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <code className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200">{path}</code>
      </div>
      <p className="pt-2 text-sm text-neutral-300">{description}</p>
    </div>
  );
}

function EntryCard({ entry }: { entry: DocEntry }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-300">{entry.kind.replace(/([A-Z])/g, " $1").trim()}</p>
          <h4 className="text-base font-semibold text-white">{entry.title}</h4>
        </div>
        <code className="rounded bg-neutral-800 px-2 py-1 text-[11px] text-neutral-200">{entry.file}</code>
      </div>
      <p className="pt-2 text-sm text-neutral-300">{entry.summary}</p>
      <pre className="mt-3 max-h-40 overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">{entry.snippet}</pre>
    </div>
  );
}

export default function GADocumentationPage() {
  return (
    <div className="space-y-10">
      <header className="rounded-xl border border-emerald-700/60 bg-emerald-950/40 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Governed Availability (GA)</p>
        <h1 className="pt-2 text-3xl font-bold text-white">Documentation & Evidence Portal</h1>
        <p className="pt-3 text-sm text-neutral-200">
          Authoritative documentation, control evidence, and auto-generated bundles that stay synchronized with code comments,
          schemas, and runbooks. Last generated: <span className="font-mono text-emerald-200">{bundle.generatedAt}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-100">
          <span className="rounded border border-emerald-600 bg-emerald-800/40 px-3 py-1 font-mono">
            pnpm --filter @topicality/website docs:generate
          </span>
          <span className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 font-mono">
            Static bundle: static/generated/ga-docs.json
          </span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {manualDocs.map((doc) => (
          <Card key={doc.path} title={doc.title} description={doc.description} path={doc.path} />
        ))}
      </section>

      <section className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">Auto-generated</p>
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="text-sm text-neutral-300">{section.description}</p>
              </div>
              <span className="rounded bg-neutral-800 px-3 py-1 text-xs text-neutral-200">
                Showing {section.entries.length} of {bundle[section.entries[0]?.kind || "codeCommentDocs"].length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {section.entries.map((entry) => (
                <EntryCard key={`${entry.file}-${entry.title}`} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

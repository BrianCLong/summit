"use client";

import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { topicality } from "@/content/topicality";
import { track } from "@/lib/analytics/client";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-32 py-20 lg:py-40 max-w-[1400px] mx-auto px-8">
      {/* High-Fidelity Hero Section */}
      <section className="space-y-12">
        <div className="inline-flex items-center gap-2 px-2 py-1 border border-[var(--border)] bg-[var(--card)]">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Status: Operational // Lane 1 Nominal</span>
        </div>

        <h1 className="text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.85]">
          The Definitive <br/>
          <span className="text-[var(--fg)]">Intelligence</span> <br/>
          <span className="opacity-30">Operating System.</span>
        </h1>

        <p className="text-2xl text-[var(--muted)] max-w-2xl font-medium leading-relaxed italic">
          "Transforming dense signal into strategic force. Summit integrates evidence, governance, and bitemporal provenance into a singular command surface."
        </p>

        <div className="flex flex-wrap gap-4">
          <Button
            className="h-16 px-10 text-xs font-bold uppercase tracking-[0.2em]"
            href="/summit"
            onClick={() => track("nav_click", { to: "/summit", label: "Explore Summit" })}
          >
            Initiate Deployment
            <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-16 px-10 text-xs font-bold uppercase tracking-[0.2em] border-[var(--border)] hover:bg-[var(--card)] transition-all"
            href="/initiatives"
            onClick={() => track("nav_click", { to: "/initiatives", label: "Initiatives" })}
          >
            System Initiatives
          </Button>
        </div>
      </section>

      {/* Pillar Matrix */}
      <div className="grid gap-1 md:grid-cols-3 border border-[var(--border)] bg-[var(--border)]">
        {topicality.pillars.map((p) => (
          <Card
            key={p.title}
            title={p.title.toUpperCase()}
            subtitle={p.subtitle.toUpperCase()}
            className="rounded-none border-none bg-[var(--bg)] p-10 hover:bg-[var(--card)] transition-colors h-full flex flex-col justify-between"
          >
            <p className="text-sm text-[var(--muted)] leading-relaxed mt-6">{p.body}</p>
            <div className="mt-10 flex justify-between items-center opacity-30">
              <span className="text-[10px] font-black mono-data tracking-widest">PROTO_V4</span>
              <Zap className="h-4 w-4" />
            </div>
          </Card>
        ))}
      </div>

      {/* Flagship Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <div className="space-y-10 sticky top-40">
          <div>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Flagship Initiative</span>
            <h2 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter mt-4">Summit Platform</h2>
          </div>
          <p className="text-lg text-[var(--muted)] leading-relaxed">
            A deep product surface for intelligence, governance, provenance, and predictive systems—built to be audited, operated, and iterated at institutional scale.
          </p>
          <div className="pt-5">
            <Button
              href="/summit"
              className="h-14 px-8 text-[10px] font-black uppercase tracking-[0.3em]"
              onClick={() => track("cta_click", { id: "home_summit_primary", to: "/summit" })}
            >
              Access Global Command →
            </Button>
          </div>
        </div>

        <div className="grid gap-px border border-[var(--border)] bg-[var(--border)]">
          {topicality.summitHighlights.map((h) => (
            <Card
              key={h.title}
              title={h.title.toUpperCase()}
              subtitle={h.subtitle.toUpperCase()}
              className="rounded-none border-none bg-[var(--card)] p-8 hover:bg-[var(--bg)] transition-colors"
            >
              <p className="text-xs text-[var(--muted)] leading-relaxed mt-4">{h.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Operational Footer Context */}
      <div className="border-t border-[var(--border)] pt-20 flex flex-col md:flex-row justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-[var(--fg)] flex items-center justify-center rounded-sm">
              <span className="text-[var(--bg)] font-black text-[10px]">IG</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Summit Ecosystem</span>
          </div>
          <p className="text-[10px] text-[var(--muted2)] max-w-xs font-medium uppercase tracking-widest leading-loose">
            High-fidelity intelligence infrastructure. <br/>
            Engineered for sovereign integrity.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          <div className="space-y-4 flex flex-col">
            <span className="text-[var(--fg)]">Substrates</span>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">IntelGraph</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Maestro</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Cognitive Moat</a>
          </div>
          <div className="space-y-4 flex flex-col">
            <span className="text-[var(--fg)]">Governance</span>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Evidence Chain</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Policy Engine</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Provenance</a>
          </div>
          <div className="space-y-4 flex flex-col">
            <span className="text-[var(--fg)]">Protocol</span>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">API Docs</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Security</a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">Compliance</a>
          </div>
        </div>
      </div>
    </div>
  );
}
